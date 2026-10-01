package com.ps515.auctionbackend.service;

import com.ps515.auctionbackend.model.*;
import com.ps515.auctionbackend.repository.*;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for handling user account suspension and cascading bid rollback.
 * When a user is suspended, all active bids are removed and previous bidders restored.
 */
@Service
public class SuspensionService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AuctionRepository auctionRepository;

    @Autowired
    private BidRepository bidRepository;

    @Autowired
    private BidHistoryRepository bidHistoryRepository;

    @Autowired
    private AutoBidRepository autoBidRepository;

    @Autowired
    private JavaMailSender mailSender;

    /**
     * Suspend a user and rollback all their active bids.
     *
     * @param username The user to suspend
     * @param reason   Why they're being suspended
     */
    @Transactional
    public void suspendUserAndRollbackBids(String username, String reason) {
        // Step 1: Suspend the user
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));

        if (user.getSuspended()) {
            throw new IllegalArgumentException("User is already suspended.");
        }

        user.setSuspended(true);
        userRepository.save(user);
        System.out.println("User suspended: " + username + " | Reason: " + reason);

        // Step 2: Find ALL active auctions where this user has placed ANY bid
        // Added "ENDED" to the filter so it catches auctions stuck in the payment window
        List<Auction> affectedAuctions = auctionRepository.findAll().stream()
                .filter(a -> "ACTIVE".equals(a.getStatus()) || "AWAITING_PAYMENT".equals(a.getStatus()) || "ENDED".equals(a.getStatus()))
                .filter(a -> {
                    // Check if the user has any bids on this auction
                    List<Bid> bids = bidRepository.findByAuction(a);
                    return bids.stream().anyMatch(b -> username.equalsIgnoreCase(b.getBidderUsername()));
                })
                .collect(Collectors.toList());

        System.out.println("Found " + affectedAuctions.size() + " auction(s) to process");

        // Step 3: Rollback each auction
        for (Auction auction : affectedAuctions) {
            rollbackAuctionBids(auction, username);
        }

        // Step 4: Deactivate all auto-bids
        List<AutoBid> userAutoBids = autoBidRepository.findByUsername(username);
        for (AutoBid bot : userAutoBids) {
            bot.setActive(false);
            autoBidRepository.save(bot);
        }
        System.out.println("Deactivated " + userAutoBids.size() + " auto-bid(s)");

        // Step 5: Notify the user
        sendSuspensionNotification(user, reason);
    }

    private void rollbackAuctionBids(Auction auction, String suspendedUsername) {
        System.out.println("Processing auction #" + auction.getAuctionId() + " | Property: " + auction.getProperty().getTitle());

        // KILL SWITCH: If the winner is suspended during the payment timer
        if ("ENDED".equals(auction.getStatus()) && suspendedUsername.equalsIgnoreCase(auction.getHighestBidder())) {
            System.out.println("Winner was suspended during payment window! Marking as PAYMENT FAILED.");

            // 1. Mark as failed
            auction.setStatus("FAILED_PAYMENT");
            auction.setPaymentDeadline(null);
            auction.setCurrentPaymentStatus(null);
            auction.setSellerNotified(true);

            if (auction.getProperty() != null) {
                auction.getProperty().setListingStatus(ListingStatus.ENDED);
            }

            // 2. Delete their bids to clean up the database
            List<Bid> suspendedUserBids = bidRepository.findByAuction(auction).stream()
                    .filter(bid -> suspendedUsername.equalsIgnoreCase(bid.getBidderUsername()))
                    .collect(Collectors.toList());

            if (!suspendedUserBids.isEmpty()) {
                bidRepository.deleteAll(suspendedUserBids);
                auction.getBids().removeAll(suspendedUserBids);
            }

            // 3. Save and email seller
            auctionRepository.save(auction);
            logBidHistoryRollback(auction.getAuctionId(), suspendedUsername);
            notifySellerPaymentFailedDueToSuspension(auction, suspendedUsername);

            return; // STOP HERE! Do not execute the normal rollback/underbidder logic below.
        }

        // NORMAL ROLLBACK LOGIC FOR ACTIVE AUCTIONS BELOW

        // 1. Delete all bids made by the suspended user for this auction
        List<Bid> suspendedUserBids = bidRepository.findByAuction(auction).stream()
                .filter(bid -> suspendedUsername.equalsIgnoreCase(bid.getBidderUsername()))
                .collect(Collectors.toList());

        if (!suspendedUserBids.isEmpty()) {
            bidRepository.deleteAll(suspendedUserBids);
            System.out.println("Removed " + suspendedUserBids.size() + " bid(s) by suspended user");
        }

        // 2. Fetch the remaining bids and sort by amount (highest first)
        List<Bid> remainingBids = bidRepository.findByAuction(auction).stream()
                // exclude the deleted bids just in case they are still in the persistence context
                .filter(bid -> !suspendedUsername.equalsIgnoreCase(bid.getBidderUsername()))
                .sorted(Comparator.comparing(Bid::getAmount).reversed())
                .collect(Collectors.toList());

        // 3. Update the auction state
        if (!remainingBids.isEmpty()) {
            Bid newHighestBid = remainingBids.get(0);

            // Only notify if the leader actually changed
            boolean leaderChanged = !newHighestBid.getBidderUsername().equals(auction.getHighestBidder());

            auction.setHighestBidder(newHighestBid.getBidderUsername());
            auction.setCurrentPrice(newHighestBid.getAmount());

            if (leaderChanged) {
                System.out.println("Restored: " + newHighestBid.getBidderUsername() + " at GBP " + newHighestBid.getAmount());
                notifyBidderRestored(newHighestBid.getBidderUsername(), auction);
            }
        } else {
            // No bids left at all
            auction.setHighestBidder(null);
            auction.setCurrentPrice(auction.getStartingPrice());
            System.out.println("No remaining bidders found - reset to starting price");
        }

        // Revert payment status if it was waiting on the suspended user
        if ("AWAITING_PAYMENT".equals(auction.getStatus())) {
            auction.setStatus("ACTIVE");
            auction.setPaymentDeadline(null);
            auction.setCurrentPaymentStatus(null);
            auction.setCurrentAttempt(1);
            System.out.println("Status reverted from AWAITING_PAYMENT to ACTIVE");
        }

        auctionRepository.save(auction);
        logBidHistoryRollback(auction.getAuctionId(), suspendedUsername);
    }

    /**
     * Notify the seller that the auction failed because the winner got suspended.
     */
    private void notifySellerPaymentFailedDueToSuspension(Auction auction, String suspendedUsername) {
        User seller = auction.getProperty().getSeller();
        if (seller == null || seller.getEmail() == null) return;

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(seller.getEmail());
            message.setSubject("Auction Failed - Winning Bidder Suspended");
            message.setText(String.format(
                    "Dear %s,\n\n" +
                            "Unfortunately, the winning bidder (%s) for your property '%s' was suspended from the platform before they could complete their payment.\n\n" +
                            "As a result, the auction has been marked as Payment Failed and the property listing has ended.\n\n" +
                            "We apologize for the inconvenience.\n\n" +
                            "Best regards,\nAuction Team",
                    seller.getUsername(), suspendedUsername, auction.getProperty().getTitle()
            ));
            mailSender.send(message);
            System.out.println("Notified seller that auction failed due to buyer suspension.");
        } catch (Exception e) {
            System.err.println("Failed to send seller notification: " + e.getMessage());
        }
    }

    /**
     * Notify the restored bidder.
     */
    private void notifyBidderRestored(String bidderUsername, Auction auction) {
        userRepository.findByUsername(bidderUsername).ifPresent(bidder -> {
            try {
                SimpleMailMessage message = new SimpleMailMessage();
                message.setTo(bidder.getEmail());
                message.setSubject("You're Back in the Lead - " + auction.getProperty().getTitle());
                message.setText(String.format(
                        "Hi %s,\n\n" +
                                "You are now the highest bidder for:\n\n" +
                                "Property: %s\n" +
                                "Your Bid: GBP %.2f\n" +
                                "Auction Ends: %s\n\n" +
                                "A previous bidder was suspended due to non-payment.\n" +
                                "You have been restored to the lead.\n\n" +
                                "Best regards,\n" +
                                "Auction Team",
                        bidder.getUsername(),
                        auction.getProperty().getTitle(),
                        auction.getCurrentPrice(),
                        auction.getEndTime()
                ));
                mailSender.send(message);
            } catch (Exception e) {
                System.err.println("Failed to send notification: " + e.getMessage());
            }
        });
    }

    /**
     * Notify the seller about the rollback.
     */
    private void notifySellerOfRollback(Auction auction, String suspendedUsername) {
        User seller = auction.getProperty().getSeller();
        if (seller == null || seller.getEmail() == null) return;

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(seller.getEmail());
            message.setSubject("Auction Update - Winning Bidder Suspended");
            message.setText(String.format(
                    "Dear %s,\n\n" +
                            "Your auction has been updated.\n\n" +
                            "Property: %s\n" +
                            "Suspended Bidder: %s\n" +
                            "Reason: Account suspended due to non-payment\n\n" +
                            "Current Status:\n" +
                            "Status: %s\n" +
                            "Current Price: GBP %.2f\n" +
                            "Current Leader: %s\n" +
                            "Ends: %s\n\n" +
                            "The auction will continue normally.\n\n" +
                            "Best regards,\n" +
                            "Auction Team",
                    seller.getUsername(),
                    auction.getProperty().getTitle(),
                    suspendedUsername,
                    auction.getStatus(),
                    auction.getCurrentPrice(),
                    auction.getHighestBidder() != null ? auction.getHighestBidder() : "None",
                    auction.getEndTime()
            ));
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Failed to send seller notification: " + e.getMessage());
        }
    }

    /**
     * Notify the suspended user.
     */
    private void sendSuspensionNotification(User user, String reason) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(user.getEmail());
            message.setSubject("Account Suspended - Action Required");
            message.setText(String.format(
                    "Dear %s,\n\n" +
                            "Your account has been suspended.\n\n" +
                            "Reason: %s\n\n" +
                            "This means:\n" +
                            "- You cannot place new bids\n" +
                            "- All your active bids have been removed\n" +
                            "- All auto-bids have been deactivated\n\n" +
                            "To appeal, contact support@auctionplatform.com\n\n" +
                            "Best regards,\n" +
                            "Auction Team",
                    user.getUsername(),
                    reason
            ));
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Failed to send suspension email: " + e.getMessage());
        }
    }

    /**
     * Log the rollback in BidHistory for audit trail.
     */
    private void logBidHistoryRollback(Long auctionId, String suspendedUsername) {
        try {
            BidHistory rollbackLog = new BidHistory();
            rollbackLog.setAuctionId(auctionId);
            rollbackLog.setBidderUsername("[SYSTEM_ROLLBACK_" + suspendedUsername + "]");
            rollbackLog.setAmount(0.0);
            bidHistoryRepository.save(rollbackLog);
        } catch (Exception e) {
            System.err.println("Failed to log rollback: " + e.getMessage());
        }
    }
}