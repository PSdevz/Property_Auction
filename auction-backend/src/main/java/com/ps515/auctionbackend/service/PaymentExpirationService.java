package com.ps515.auctionbackend.service;

import com.ps515.auctionbackend.model.*;
import com.ps515.auctionbackend.repository.*;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Service responsible for processing auction expirations and payment deadline enforcement.
 * Runs automatically via scheduled task to detect finished auctions and apply penalties
 * for non-payment.
 */
@Service
public class PaymentExpirationService {

    @Autowired private SuspensionService suspensionService;
    @Autowired private AuctionRepository auctionRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private JavaMailSender mailSender;
    @Autowired private BidRepository bidRepository;
    @Autowired private PropertyRepository propertyRepository;
    @Autowired private BidHistoryRepository bidHistoryRepository;
    @Autowired private TicketRepository ticketRepository;

    /**
     * Scheduled job that runs every 5 seconds to:
     * 1. Close auctions that have reached their end time
     * 2. Enforce payment deadlines and apply strikes to non-paying bidders
     */
    @Scheduled(fixedRate = 5000)
    @Transactional
    public void processAuctionsAndPayments() {
        LocalDateTime now = LocalDateTime.now();

        // =====================================================================
        // LOOP 1: Process ACTIVE -> ENDED (The part that was missing!)
        // =====================================================================
        List<Auction> finished = auctionRepository.findByStatusAndEndTimeBefore("ACTIVE", now);

        for (Auction auction : finished) {
            try {
                Property property = auction.getProperty();

                if (auction.getHighestBidder() != null) {
                    boolean reserveMet = auction.isReserveMet();

                    if (reserveMet) {
                        auction.setStatus("ENDED");
                        auction.setPaymentDeadline(now.plusMinutes(1)); // 1 minute for testing
                    } else {
                        auction.setStatus("ENDED");
                        auction.setPaymentDeadline(null);
                        auction.setSellerNotified(true);

                        if (property != null) {
                            property.setListingStatus(ListingStatus.ENDED);
                            propertyRepository.save(property);
                        }

                        auctionRepository.save(auction);
                        notifySellerReserveNotMet(auction);
                        continue;
                    }
                } else {
                    auction.setStatus("NO_BIDS");
                    auction.setPaymentDeadline(null);
                    auction.setSellerNotified(true);

                    if (property != null) {
                        property.setListingStatus(ListingStatus.ENDED);
                        propertyRepository.save(property);
                    }

                    auctionRepository.save(auction);
                    notifySellerNoBids(auction);
                    continue;
                }

                auctionRepository.save(auction);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }



        // LOOP 2: Process ENDED -> FAILED_PAYMENT (Strikes and Suspensions)

        List<Auction> expired = auctionRepository.findByStatusAndPaymentDeadlineBefore("ENDED", now);

        for (Auction auction : expired) {
            try {
                String bidder = auction.getHighestBidder();

                if (bidder != null && !bidder.isEmpty()) {
                    userRepository.findByUsernameIgnoreCase(bidder.trim()).ifPresent(user -> {
                        int current = user.getUnpaidStrikes() != null ? user.getUnpaidStrikes() : 0;

                        if (current < 3) {
                            int next = current + 1;
                            user.setUnpaidStrikes(next);
                            userRepository.save(user); // Save the strike count first

                            // If 3rd strike, trigger suspension service
                            if (next >= 3) {
                                try {
                                    String reason = "Non-payment strike 3 of 3 - Account automatically suspended";
                                    // Let the service handle setting user.setSuspended(true)
                                    suspensionService.suspendUserAndRollbackBids(bidder.trim(), reason);
                                } catch (Exception e) {
                                    System.err.println("Error during suspension: " + e.getMessage());
                                }
                            }

                            // Send warning email
                            try {
                                String propertyTitle = auction.getProperty() != null ?
                                        auction.getProperty().getTitle() : "Unknown";
                                // Pass next >= 3 to indicate if they just got suspended
                                sendWarningEmail(user.getEmail(), next, next >= 3, propertyTitle);
                            } catch (Exception e) {
                                System.err.println("Failed to send warning email: " + e.getMessage());
                            }
                        }
                    });
                }

                // Update the auction so it doesn't get picked up in the next 5-second loop
                auction.setStatus("FAILED_PAYMENT");
                auction.setPaymentDeadline(null);
                auction.setSellerNotified(true);

                Property property = auction.getProperty();
                if (property != null) {
                    property.setListingStatus(ListingStatus.ENDED);
                    propertyRepository.save(property);
                }

                auctionRepository.save(auction);
                notifySellerPaymentFailed(auction);

            } catch (Exception e) {
                System.err.println("Failed to process expired auction: " + auction.getAuctionId());
                e.printStackTrace();
            }
        }
    }

    /**
     * Sends warning email to bidder who failed to pay deposit.
     */
    private void sendWarningEmail(String toEmail, int strikes, boolean isSuspended, String propertyTitle) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(toEmail);
            message.setSubject(isSuspended ? "Account Suspended" : "Unpaid Auction Deposit Warning");
            message.setText("Payment window expired for: " + propertyTitle + ". Strike count: " + strikes + "/3.");
            mailSender.send(message);
        } catch (Exception e) {
            throw e;
        }
    }

    /**
     * Notifies seller when their auction ends with no bids.
     */
    private void notifySellerNoBids(Auction auction) {
        try {
            Property property = auction.getProperty();
            if (property == null) return;
            User seller = property.getSeller();
            if (seller == null) return;
            String sellerEmail = seller.getEmail();
            if (sellerEmail == null || sellerEmail.trim().isEmpty()) return;

            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(sellerEmail);
            message.setSubject("Auction Ended - No Bids Received");
            message.setText(String.format(
                    "Dear %s,\n\n" +
                            "Your auction has ended without receiving any bids.\n\n" +
                            "Property: %s\n" +
                            "Starting Price: £%.2f\n" +
                            "Ended At: %s\n\n" +
                            "Best regards,\nAuction Team",
                    seller.getUsername(), property.getTitle(), auction.getStartingPrice(), auction.getEndTime()
            ));
            mailSender.send(message);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    /**
     * Notifies seller when auction ends with bids but reserve price was not met.
     */
    private void notifySellerReserveNotMet(Auction auction) {
        try {
            Property property = auction.getProperty();
            if (property == null) return;
            User seller = property.getSeller();
            if (seller == null) return;
            String sellerEmail = seller.getEmail();
            if (sellerEmail == null || sellerEmail.trim().isEmpty()) return;

            String highestBidder = auction.getHighestBidder();
            double highestBid = auction.getCurrentPrice();
            double reservePrice = auction.getReservePrice() != null ? auction.getReservePrice() : 0.0;
            double shortfall = reservePrice - highestBid;

            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(sellerEmail);
            message.setSubject("Auction Ended - Reserve Price Not Met");
            message.setText(String.format(
                    "Dear %s,\n\n" +
                            "Your auction has ended, but the reserve price was not met.\n\n" +
                            "Property: %s\n" +
                            "Reserve Price: £%.2f\n" +
                            "Highest Bid: £%.2f\n" +
                            "Highest Bidder: %s\n" +
                            "Shortfall: £%.2f\n" +
                            "Ended At: %s\n\n" +
                            "Best regards,\nAuction Team",
                    seller.getUsername(), property.getTitle(), reservePrice, highestBid,
                    highestBidder != null ? highestBidder : "Unknown", shortfall, auction.getEndTime()
            ));
            mailSender.send(message);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    /**
     * Unsuspend a user (admin action)
     */
    @Transactional
    public void unsuspendUser(String username, String reason) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));

        if (!user.getSuspended()) {
            throw new IllegalArgumentException("User is not suspended.");
        }

        user.setSuspended(false);
        userRepository.save(user);
        System.out.println("User unsuspended: " + username + " | Reason: " + reason);

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(user.getEmail());
            message.setSubject("Account Unsuspended - Welcome Back");
            message.setText(String.format(
                    "Dear %s,\n\nYour account has been unsuspended.\n\nBest regards,\nAuction Team",
                    user.getUsername()
            ));
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Failed to send email: " + e.getMessage());
        }
    }

    /**
     * Reset strike count to 0 (admin action)
     */
    @Transactional
    public void resetStrikes(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));

        int previousStrikes = user.getUnpaidStrikes();
        user.setUnpaidStrikes(0);
        user.setSuspended(false);
        userRepository.save(user);

        System.out.println("Strikes reset: " + username + " (was " + previousStrikes + "/3)");

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(user.getEmail());
            message.setSubject("Strikes Reset");
            message.setText(String.format(
                    "Dear %s,\n\nYour strike count has been reset to 0.\nYou have a fresh start.\n\nBest regards,\nAuction Team",
                    user.getUsername()
            ));
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Failed to send email: " + e.getMessage());
        }
    }

    /**
     * Notifies seller when winning bidder fails to pay deposit.
     */
    private void notifySellerPaymentFailed(Auction auction) {
        try {
            Property property = auction.getProperty();
            if (property == null) return;
            User seller = property.getSeller();
            if (seller == null) return;
            String sellerEmail = seller.getEmail();
            if (sellerEmail == null || sellerEmail.trim().isEmpty()) return;

            String winnerUsername = auction.getHighestBidder();

            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(sellerEmail);
            message.setSubject("Auction Failed - Buyer Did Not Pay Deposit");
            message.setText(String.format(
                    "Dear %s,\n\n" +
                            "Unfortunately, the winning bidder failed to pay the deposit within the required timeframe.\n\n" +
                            "Property: %s\n" +
                            "Winning Bid: £%.2f\n" +
                            "Winner: %s\n" +
                            "Payment Deadline: %s\n\n" +
                            "Best regards,\nAuction Team",
                    seller.getUsername(), property.getTitle(), auction.getCurrentPrice(),
                    winnerUsername != null ? winnerUsername : "Unknown", auction.getPaymentDeadline()
            ));
            mailSender.send(message);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
    @Autowired private AutoBidRepository autoBidRepository;

    /**
     * Suspend a seller account and deactivate ONLY their currently active properties
     */
    @Transactional
    public void suspendSellerAndHandleProperties(String sellerUsername, String reason) {
        System.out.println(">>> STARTING SUSPENSION FOR: " + sellerUsername);

        // 1. Find properties.
        // IMPORTANT: We only notify for properties that are currently ACTIVE.
        List<Property> activeSellerProperties = propertyRepository.findAll().stream()
                .filter(p -> sellerUsername.equalsIgnoreCase(p.getSellerUsername()))
                .filter(p -> p.getListingStatus() == ListingStatus.ACTIVE)
                .collect(Collectors.toList());

        System.out.println("Found " + activeSellerProperties.size() + " active properties to process.");

        for (Property property : activeSellerProperties) {
            // We fetch the auction explicitly to ensure we have the latest data
            Auction auction = auctionRepository.findByProperty(property);

            if (auction != null) {
                System.out.println("Processing Auction for property: " + property.getTitle());

                // Tag for the "Manual vs Auto" logic we built
                auction.setSuspendedBySellerStatus(true);

                // 2. FREEZE THE CLOCK
                LocalDateTime now = LocalDateTime.now();
                if (auction.getEndTime() != null && auction.getEndTime().isAfter(now)) {
                    long remainingSeconds = java.time.temporal.ChronoUnit.SECONDS.between(now, auction.getEndTime());
                    auction.setPausedRemainingSeconds(remainingSeconds);
                }

                // 3.EMAIL NOTIFICATION LOGIC
                List<Bid> allBids = bidRepository.findByAuction(auction);
                System.out.println("Found " + allBids.size() + " bids to cancel for this property.");

                if (!allBids.isEmpty()) {
                    Set<String> affectedBuyers = allBids.stream()
                            .map(Bid::getBidderUsername)
                            .filter(Objects::nonNull)
                            .collect(Collectors.toSet());

                    for (String buyerUsername : affectedBuyers) {
                        //THIS IS THE CALL THAT SENDS THE EMAIL
                        notifyBuyerBidCancelled(buyerUsername, property.getTitle());
                    }

                    // 4. DELETE BIDS (Only after emailing!)
                    bidRepository.deleteAll(allBids);
                }

                // 5. DELETE HISTORY & RESET
                List<BidHistory> allHistory = bidHistoryRepository.findByAuctionId(auction.getAuctionId());
                if (!allHistory.isEmpty()) {
                    bidHistoryRepository.deleteAll(allHistory);
                }

                auction.setHighestBidder(null);
                auction.setCurrentPrice(auction.getStartingPrice());
                auction.getBids().clear();
                auction.setStatus("DEACTIVATED");
                auctionRepository.save(auction);
            }

            property.setListingStatus(ListingStatus.DEACTIVATED);
            propertyRepository.save(property);
        }



        sendSellerSuspensionEmail(sellerUsername, reason);
    }

    /**
     * Unsuspend a seller account and restore ONLY properties that were frozen by the suspension
     */
    @Transactional
    public void unsuspendSellerAndRestoreProperties(String sellerUsername) {
        System.out.println("Unsuspending seller: " + sellerUsername);

        List<Property> sellerProperties = propertyRepository.findAll().stream()
                .filter(p -> sellerUsername.equalsIgnoreCase(p.getSellerUsername()))
                .filter(p -> p.getListingStatus() == ListingStatus.DEACTIVATED)
                .collect(Collectors.toList());

        for (Property property : sellerProperties) {
            if (property.getAuction() != null) {
                Auction auction = property.getAuction();

                // ONLY restore if the "Suspended By System" tag is TRUE.

                if (Boolean.TRUE.equals(auction.getSuspendedBySellerStatus())) {

                    LocalDateTime now = LocalDateTime.now();

                    // 1. UNFREEZE THE CLOCK
                    if (auction.getPausedRemainingSeconds() != null && auction.getPausedRemainingSeconds() > 0) {
                        auction.setEndTime(now.plusSeconds(auction.getPausedRemainingSeconds()));
                    } else {
                        auction.setEndTime(now.plusDays(7));
                    }

                    // 2. CLEAR THE FINGERPRINTS
                    auction.setPausedRemainingSeconds(null);
                    auction.setSuspendedBySellerStatus(false); // Reset the tag!

                    // 3. RESTORE
                    auction.setStatus("ACTIVE");
                    auction.setManualOverride(false);
                    auctionRepository.save(auction);
                    property.setListingStatus(ListingStatus.ACTIVE);
                    propertyRepository.save(property);

                    System.out.println("Restored suspension-paused property: " + property.getTitle());
                } else {
                    System.out.println("Skipping manually deactivated property: " + property.getTitle());
                }
            }
        }
        sendSellerUnsuspensionEmail(sellerUsername);
    }

    /**
     * Helper Method: Notify buyer their bid was cancelled due to seller suspension
     */
    public void notifyBuyerBidCancelled(String buyerUsername, String propertyTitle) {
        userRepository.findByUsername(buyerUsername).ifPresent(user -> {
            try {
                SimpleMailMessage message = new SimpleMailMessage();
                message.setTo(user.getEmail());
                message.setSubject("Bid Cancelled - Property Removed From Market");
                message.setText(String.format(
                        "Dear %s,\n\n" +
                                "This is an automated notification to inform you that the property '%s' has been removed from the market by the system administrator.\n\n" +
                                "As a result, your active bids on this property have been safely cancelled. No funds have been captured.\n\n" +
                                "We apologize for any inconvenience.\n\n" +
                                "Best regards,\nAuctionPro Team",
                        buyerUsername, propertyTitle
                ));
                mailSender.send(message);
                System.out.println("Sent bid cancellation email to buyer: " + buyerUsername);
            } catch (Exception e) {
                System.err.println("Failed to send bid cancellation email to " + buyerUsername + ": " + e.getMessage());
            }
        });
    }
    /**
     * Notify seller they've been suspended
     */
    private void sendSellerSuspensionEmail(String sellerUsername, String reason) {
        userRepository.findByUsername(sellerUsername).ifPresent(user -> {
            try {
                SimpleMailMessage message = new SimpleMailMessage();
                message.setTo(user.getEmail());
                message.setSubject("Account Suspended - All Listings Removed");
                message.setText(String.format(
                        "Dear %s,\n\n" +
                                "Your seller account has been suspended.\n\n" +
                                "Reason: %s\n\n" +
                                "As a result:\n" +
                                "- All your active auctions have been deactivated\n" +
                                "- All bids on your properties have been cancelled\n" +
                                "- Your properties have been removed from the market\n\n" +
                                "Contact support@auctionplatform.com to appeal.\n\n" +
                                "Best regards,\nAuction Team",
                        sellerUsername,
                        reason
                ));
                mailSender.send(message);
            } catch (Exception e) {
                System.err.println("Failed to send seller suspension email: " + e.getMessage());
            }
        });
    }

    /**
     * Notify seller they've been unsuspended
     */
    private void sendSellerUnsuspensionEmail(String sellerUsername) {
        userRepository.findByUsername(sellerUsername).ifPresent(user -> {
            try {
                SimpleMailMessage message = new SimpleMailMessage();
                message.setTo(user.getEmail());
                message.setSubject("Account Unsuspended - Properties Restored");
                message.setText(String.format(
                        "Dear %s,\n\n" +
                                "Your seller account has been unsuspended.\n\n" +
                                "Your properties have been restored to the market:\n" +
                                "- All previous bids have been removed\n" +
                                "- Remaining auction time has been preserved\n" +
                                "- You can resume normal auction operations\n\n" +
                                "Best regards,\nAuction Team",
                        sellerUsername
                ));
                mailSender.send(message);
            } catch (Exception e) {
                System.err.println("Failed to send seller unsuspension email: " + e.getMessage());
            }
        });
    }

}