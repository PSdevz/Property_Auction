package com.ps515.auctionbackend.service;

import com.ps515.auctionbackend.model.*;
import com.ps515.auctionbackend.repository.AuctionRepository;
import com.ps515.auctionbackend.repository.AutoBidRepository;
import com.ps515.auctionbackend.repository.BidHistoryRepository;
import com.ps515.auctionbackend.repository.BidRepository;
import com.ps515.auctionbackend.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import com.ps515.auctionbackend.exception.ResourceNotFoundException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class AuctionService {

    @Autowired
    private BidRepository bidRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BidHistoryRepository bidHistoryRepository;

    @Autowired
    private AuthService authService;

    @Autowired
    private AuctionRepository auctionRepository;

    @Autowired
    private AutoBidRepository autoBidRepository;

    public User getUserByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    public void saveUser(User user) {
        userRepository.save(user);
    }

    @Autowired
    private JavaMailSender mailSender; // Ensure this is autowired at the top

    private void notifyUserOutbid(String outbidUsername, Auction auction, double newPrice) {
        userRepository.findByUsername(outbidUsername).ifPresent(user -> {
            try {
                SimpleMailMessage message = new SimpleMailMessage();
                message.setTo(user.getEmail());
                message.setSubject("You've been outbid! - " + auction.getProperty().getTitle());
                message.setText(String.format(
                        "Hi %s,\n\nSomeone just placed a higher bid on %s.\n\n" +
                                "The new current price is: £%.2f\n" +
                                "Visit the property page to place a higher bid and stay in the running!\n\n" +
                                "Best regards,\nThe Auction Team",
                        user.getUsername(),
                        auction.getProperty().getTitle(),
                        newPrice
                ));
                mailSender.send(message);
            } catch (Exception e) {
                System.err.println("Failed to send outbid email: " + e.getMessage());
            }
        });
    }
    @Transactional
    public String placeBid(Long auctionId, Double bidAmount, String bidderUsername) {

        User bidder = userRepository.findByUsername(bidderUsername)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (Boolean.TRUE.equals(bidder.getSuspended())) {
            throw new IllegalArgumentException("Your account is suspended. You cannot place bids.");
        }

        Auction auction = auctionRepository.findById(auctionId)
                .orElseThrow(() -> new ResourceNotFoundException("Auction not found"));

        if (LocalDateTime.now().isAfter(auction.getEndTime())) {
            throw new IllegalArgumentException("Auction has already ended.");
        }

        if (bidderUsername.equals(auction.getHighestBidder())) {
            throw new IllegalArgumentException("You are already the highest bidder.");
        }

        if (bidAmount <= auction.getCurrentPrice()) {
            throw new IllegalArgumentException("Bid must be higher than £" +
                    String.format("%,.0f", auction.getCurrentPrice()));
        }

        if (bidAmount < auction.getReservePrice()) {
            throw new IllegalArgumentException("Bid must meet the reserve price of £" +
                    String.format("%,.0f", auction.getReservePrice()));
        }

        String previousLeader = auction.getHighestBidder();

        auction.setCurrentPrice(bidAmount);
        auction.setHighestBidder(bidderUsername);

        try {
            auctionRepository.save(auction);
        } catch (OptimisticLockingFailureException e) {
            Auction freshAuction = auctionRepository.findById(auctionId)
                    .orElseThrow(() -> new ResourceNotFoundException("Auction not found"));

            if (bidAmount <= freshAuction.getCurrentPrice()) {
                throw new IllegalArgumentException(
                        "Someone else just placed a bid. Current highest is now £" +
                                String.format("%,.0f", freshAuction.getCurrentPrice())
                );
            }

            previousLeader = freshAuction.getHighestBidder();
            freshAuction.setCurrentPrice(bidAmount);
            freshAuction.setHighestBidder(bidderUsername);
            auctionRepository.save(freshAuction);
            auction = freshAuction;
        }

        // Refresh auction to ensure relationship is loaded
        auction = auctionRepository.findById(auctionId)
                .orElseThrow(() -> new ResourceNotFoundException("Auction not found"));

        if (previousLeader != null && !previousLeader.equalsIgnoreCase(bidderUsername)) {
            notifyUserOutbid(previousLeader, auction, bidAmount);
        }

        Bid newBid = new Bid(bidAmount, bidderUsername, auction);
        bidRepository.save(newBid);
        saveBidHistory(auctionId, bidderUsername, bidAmount);

        processAutoBids(auction);

        try {
            User user = authService.getUserByUsername(bidderUsername);
            Long activeBidsCount = bidRepository.countActiveBidsByUser(bidderUsername);
            user.setActiveBids(activeBidsCount);
            authService.saveUser(user);
        } catch (Exception e) {
            System.err.println("User update failed (non-critical): " + e.getMessage());
        }

        return "Bid placed successfully!";
    }
    // ══════════ AUTO-BID ENGINE (PROXY BIDDING — INDUSTRY STANDARD) ══════
    /**
     * True proxy bidding as used by eBay, Rightmove Auctions, and Bid4Assets.
     *
     * The system bids the MINIMUM price step above the current bid, capped at
     * the bot's maxAmount. The user-defined incrementAmount on AutoBid is NOT
     * used here — it only applies when the buyer manually sets up the bot
     * (the initial bid in placeAutoBidOnSetup). After that, the engine always
     * uses getMinimumBidStep() to stay competitive at the lowest cost.
     *
     * Example (mirrors eBay behaviour):
     *   Current: £100,000 | Bot A max: £150,000 | Bot B max: £130,000
     *   Human bids £110,000 → Bot A counters at £112,000 (min step: £2,000)
     *   Human bids £145,000 → Bot A counters at £147,000
     *   Human bids £152,000 → Bot A's ceiling beaten, deactivated, human wins
     */
    private void processAutoBids(Auction auction) {
        int safetyLimit = 2000;

        while (safetyLimit-- > 0) {
            // Must re-fetch every iteration — @Version requires a fresh copy to save
            auction = auctionRepository.findById(auction.getAuctionId()).orElse(null);
            if (auction == null) break;


            //every active auto-bid configured for this auction
            List<AutoBid> activeBots = autoBidRepository.findByAuctionIdAndActiveTrue(auction.getAuctionId());
            if (activeBots.isEmpty()) break;

            double currentBid = auction.getCurrentPrice();

            //Capture the leader BEFORE the bot places a new bid
            String previousLeader = auction.getHighestBidder();

            // Deactivate any bot whose ceiling has been surpassed
            for (AutoBid bot : activeBots) {
                if (bot.getMaxAmount() <= currentBid) {
                    bot.setActive(false);
                    autoBidRepository.save(bot);
                }
            }

            // Find the eligible bot with the highest ceiling that isn't already winning
            AutoBid nextBot = null;
            double highestCeiling = 0;
            for (AutoBid bot : activeBots) {
                if (!bot.isActive()) continue;
                if (bot.getUsername().equals(previousLeader)) continue; // Skip to next bot if same username
                if (bot.getMaxAmount() > highestCeiling) {
                    highestCeiling = bot.getMaxAmount();
                    nextBot = bot;
                }
            }

            if (nextBot == null) break;

            // Bid the minimum step above current, capped at the bot's ceiling
            double minStep = getMinimumBidStep(currentBid);
            double newBidAmount = Math.min(currentBid + minStep, nextBot.getMaxAmount());

            // Safety: if we can't move the price, stop
            if (newBidAmount <= currentBid) break;

            // Apply the bot's bid
            auction.setCurrentPrice(newBidAmount);
            auction.setHighestBidder(nextBot.getUsername());
            auctionRepository.save(auction);

            // Notify the person the bot just outbid
            // This ensures a human gets an email the second a bot beats their price
            if (previousLeader != null && !previousLeader.equalsIgnoreCase(nextBot.getUsername())) {
                notifyUserOutbid(previousLeader, auction, newBidAmount);
            }

            // Persist the bot's bid record + history
            Bid botBid = new Bid(newBidAmount, nextBot.getUsername(), auction);
            bidRepository.save(botBid);
            saveBidHistory(auction.getAuctionId(), nextBot.getUsername(), newBidAmount);

            // Deactivate bot if it has hit its ceiling
            if (newBidAmount >= nextBot.getMaxAmount()) {
                nextBot.setActive(false);
                autoBidRepository.save(nextBot);
            }
        }
    }

    /**
     * Minimum bid increment by price band.
     * Mirrors RICS auction guidelines and UK property auction platforms.
     *
     * Under £50k:    £500 steps
     * £50k–£100k:   £1,000 steps
     * £100k–£500k:  £2,000 steps
     * £500k+:       £5,000 steps
     */
    private double getMinimumBidStep(double currentPrice) {
        if (currentPrice < 50_000)  return 500;
        if (currentPrice < 100_000) return 1_000;
        if (currentPrice < 500_000) return 2_000;
        return 5_000;
    }


    private void saveBidHistory(Long auctionId, String username, double amount) {
        BidHistory history = new BidHistory();
        history.setAuctionId(auctionId);
        history.setBidderUsername(username);
        history.setAmount(amount);
        bidHistoryRepository.save(history);
    }

    // ══════════ IMMEDIATE BID ON BOT SETUP ═══════════════════════════════
    /**
     * Called immediately when a buyer sets up an auto-bid.
     * Places (currentPrice + increment) on their behalf right away,
     * capped at their maxAmount. Then lets the engine run so other bots
     * can respond.
     */
    @Transactional
    public String placeAutoBidOnSetup(Long auctionId, String username, double increment, double maxAmount) {
        Auction auction = auctionRepository.findById(auctionId)
                .orElseThrow(() -> new ResourceNotFoundException("Auction not found"));

        if (LocalDateTime.now().isAfter(auction.getEndTime())) {
            throw new IllegalArgumentException("This auction has already ended.");
        }

        // 1. TIE-BREAKER CHECK: Find the existing "Hidden Max" among other buyers
        List<AutoBid> otherBots = autoBidRepository.findByAuctionIdAndActiveTrue(auctionId);
        double existingHighestMax = otherBots.stream()
                .filter(b -> !b.getUsername().equalsIgnoreCase(username))
                .mapToDouble(AutoBid::getMaxAmount)
                .max()
                .orElse(0.0);

        double currentBid = auction.getCurrentPrice();

        // 2. GET OR CREATE BOT: Update existing bot if it exists, otherwise make a new one
        AutoBid bot = autoBidRepository.findByUsernameAndAuctionId(username, auctionId)
                .orElse(new AutoBid());

        bot.setUsername(username);
        bot.setAuctionId(auctionId);
        bot.setMaxAmount(maxAmount);
        bot.setIncrementAmount(increment); // Use the correct field name from your model
        bot.setActive(true);

        // 3. LOGIC: If the new max is a TIE or LOWER than an existing bot
        if (maxAmount <= existingHighestMax) {
            auction.setCurrentPrice(maxAmount);
            auctionRepository.save(auction);

            bot.setActive(false); // Deactivate immediately because they've been outbid
            autoBidRepository.save(bot);

            return "Auto-bid set. However, another user placed a higher or equal limit earlier. Price is now £" +
                    String.format("%,.0f", maxAmount) + " and you are outbid.";
        }

        // 4. LOGIC: If the new max takes the lead
        double immediateBid = Math.min(currentBid + increment, maxAmount);

        // Ensure we jump over the existing highest "hidden" bot
        if (immediateBid <= existingHighestMax) {
            double step = getMinimumBidStep(existingHighestMax);
            immediateBid = Math.min(existingHighestMax + step, maxAmount);
        }

        auction.setCurrentPrice(immediateBid);
        auction.setHighestBidder(username);
        auctionRepository.save(auction);

        autoBidRepository.save(bot); // Save the active bot

        // Run the engine to check if other bots need to respond
        processAutoBids(auction);

        return "Success: You are now the highest bidder at £" + String.format("%,.0f", immediateBid) + ".";
    }

    public List<Property> getActiveBidsByUser(String username) {
        List<Bid> bids = bidRepository.findActiveBidsByUser(username);
        Set<Property> properties = new HashSet<>();
        for (Bid bid : bids) {
            Auction auction = bid.getAuction();
            if (auction != null && auction.getProperty() != null) {
                properties.add(auction.getProperty());
            }
        }
        return new ArrayList<>(properties);
    }

    public List<Property> getAllBidsByUser(String username) {
        List<Bid> bids = bidRepository.findAllBidsByUser(username);
        Set<Property> properties = new HashSet<>();
        for (Bid bid : bids) {
            Auction auction = bid.getAuction();
            if (auction != null && auction.getProperty() != null) {
                properties.add(auction.getProperty());
            }
        }
        return new ArrayList<>(properties);
    }

    public List<BidHistory> getBidHistoryByUser(String username) {
        return bidHistoryRepository.findByBidderUsernameOrderByTimestampDesc(username);
    }

    @Transactional
    public void reactivateAuction(Long auctionId) {
        Auction auction = auctionRepository.findById(auctionId)
                .orElseThrow(() -> new RuntimeException("Auction not found"));

        // 1. Identify the buyer who was about to be struck
        String offender = auction.getHighestBidder();

        // 2. SAFETY GUARD: If the user was already struck/suspended by this auction,
        // we must manually reverse it.
        if (offender != null) {
            userRepository.findByUsername(offender).ifPresent(user -> {
                // Decrease strikes if the system already added one
                if (user.getUnpaidStrikes() > 0) {
                    user.setUnpaidStrikes(user.getUnpaidStrikes() - 1);
                }
                // Lift suspension if they were at the limit
                if (user.getUnpaidStrikes() < 3) {
                    user.setSuspended(false);
                }
                userRepository.save(user);
            });
        }

        // 3. WIPE THE CRIME SCENE (The Auction Record)
        auction.setStatus("ACTIVE");
        auction.setCurrentPaymentStatus(null);
        auction.setFailedPayerUsername(null); // CRITICAL: Clear this!
        auction.setHighestBidder(null);       // Reset so the "offender" isn't linked anymore
        auction.setCurrentPrice(auction.getStartingPrice());
        auction.setCurrentAttempt(1);

        // 4. RESET THE CLOCK
        auction.setStartTime(LocalDateTime.now());
        auction.setEndTime(LocalDateTime.now().plusDays(auction.getProperty().getDuration()));

        auctionRepository.save(auction);
    }
    /**
     * Admin action to manually stop an auction without triggering
     * winner notifications or non-payment strikes.
     * This ensures the UI reflects a "Deactivated" state rather than an "Ended" one.
     */
    @Transactional
    public void deactivateAuction(Long auctionId) {
        Auction auction = auctionRepository.findById(auctionId)
                .orElseThrow(() -> new ResourceNotFoundException("Auction not found"));

        // 1. Change status to DEACTIVATED
        // This stops the React frontend from showing the "Congratulations" box
        auction.setStatus("DEACTIVATED");

        // 2. Kill the timer immediately
        // By setting the end time to 'now', the frontend countdown will stop
        auction.setEndTime(LocalDateTime.now());

        // 3. Set the Manual Override flag
        // This ensures the PaymentExpirationService scheduled task ignores this auction
        auction.setManualOverride(true);

        // 4. Clear all payment-related deadlines
        auction.setPaymentDeadline(null);
        auction.setCurrentPaymentStatus(null);

        // 5. Update the parent Property listing status
        if (auction.getProperty() != null) {
            auction.getProperty().setListingStatus(ListingStatus.DEACTIVATED);
        }

        auctionRepository.save(auction);
    }




}