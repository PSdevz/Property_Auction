package com.ps515.auctionbackend.service;

import com.ps515.auctionbackend.model.*;
import com.ps515.auctionbackend.repository.*;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class AdminService {

    @Autowired
    private BidHistoryRepository bidHistoryRepository;

    @Autowired
    private AuctionRepository auctionRepository;

    @Autowired
    private BidRepository bidRepository;

    @Autowired
    private PropertyRepository propertyRepository;

    // ══════════ ACTIVITY LOG ══════════

    public Page<BidHistory> getFilteredActivity(int page, int size, String search) {
        Pageable pageable = PageRequest.of(page/**which page(default zero)*/, size/**how many*/, Sort.by("timestamp").descending());

        if (search == null || search.trim().isEmpty()) {
            return bidHistoryRepository.findAll(pageable);
        }

        return bidHistoryRepository.searchActivity(search.trim(), pageable);
    }

    // ══════════ AUCTION CLEANUP ══════════

    /**
     * Cleans up any auctions where this user is the highest bidder
     * but hasn't paid. This prevents the scheduler from giving
     * false strikes after an admin unsuspends or suspends the user.
     */
    @Transactional
    public void cleanupDefaultedAuctionsForUser(String username) {
        List<Auction> defaultedAuctions = auctionRepository
                .findByStatusAndHighestBidder("AWAITING_PAYMENT", username);

        for (Auction auction : defaultedAuctions) {
            System.out.println("🧹 Cleaning up defaulted auction #"
                    + auction.getAuctionId() + " for user: " + username);

            // Record the failure
            auction.setFailedPayerUsername(username);
            auction.setFailedPaymentTime(LocalDateTime.now());
            auction.setStatus("DEFAULTED");

            // Try to find the next best bidder
            Optional<Bid> nextBestBid = bidRepository
                    .findTopByAuctionAndBidderUsernameNotOrderByAmountDesc(auction, username);

            if (nextBestBid.isPresent()) {
                // Pass to underbidder
                Bid underbidder = nextBestBid.get();
                auction.setHighestBidder(underbidder.getBidderUsername());
                auction.setCurrentPrice(underbidder.getAmount());
                auction.setPaymentDeadline(LocalDateTime.now().plusMinutes(1));
                auction.setCurrentPaymentStatus("SECOND_CHANCE");
                auction.setCurrentAttempt(2);
                auction.setStatus("AWAITING_PAYMENT");

                Property property = auction.getProperty();
                if (property != null) {
                    property.setListingStatus(ListingStatus.SOLD);
                    propertyRepository.save(property);
                }

                System.out.println("Passed to underbidder: " + underbidder.getBidderUsername() +
                        " at £" + String.format("%,.0f", underbidder.getAmount()));
            } else {
                // No underbidders — relist with full cleanup
                relistAuction(auction);
            }

            auctionRepository.save(auction);
        }
    }

    // ══════════ RELIST AUCTION WITH FULL CLEANUP ══════════

    @Transactional
    public void relistAuction(Auction auction) {
        Property property = auction.getProperty();

        // Delete ALL old bids from this auction
        List<Bid> oldBids = bidRepository.findByAuction(auction);
        if (!oldBids.isEmpty()) {
            bidRepository.deleteAll(oldBids);
            System.out.println("🗑️ Deleted " + oldBids.size() + " old bids from auction #" + auction.getAuctionId());
        }

        // Also delete bid history for this auction
        bidHistoryRepository.deleteByAuctionId(auction.getAuctionId());

        // Track the failure on the property
        if (property != null) {

            property.setAutoRelisted(true);
            property.setListingStatus(ListingStatus.ACTIVE);
            propertyRepository.save(property);
        }

        // Reset auction to fresh state
        auction.setHighestBidder(null);
        auction.setCurrentPrice(auction.getStartingPrice());
        auction.setStartTime(LocalDateTime.now());
        auction.setEndTime(LocalDateTime.now().plusDays(3)); // 3-day fast track
        auction.setPaymentDeadline(null);
        auction.setCurrentPaymentStatus(null);
        auction.setCurrentAttempt(1);
        auction.setStatus("ACTIVE");

        // Clear the bids collection
        auction.getBids().clear();


        auctionRepository.save(auction);
    }

    // ══════════ BULK CLEANUP ══════════

    /**
     * Clean up all defaulted auctions across the system
     * Useful for admin maintenance tasks
     */
    @Transactional
    public int cleanupAllDefaultedAuctions() {
        List<Auction> defaultedAuctions = auctionRepository.findByStatus("AWAITING_PAYMENT");
        int cleaned = 0;

        LocalDateTime now = LocalDateTime.now();

        for (Auction auction : defaultedAuctions) {
            if (auction.getPaymentDeadline() != null &&
                    now.isAfter(auction.getPaymentDeadline())) {

                String username = auction.getHighestBidder();
                if (username != null) {
                    cleanupDefaultedAuctionsForUser(username);
                    cleaned++;
                }
            }
        }

        System.out.println("🧹 Bulk cleanup completed. Processed " + cleaned + " defaulted auctions.");
        return cleaned;
    }

    // ══════════ RESET AUCTION (ADMIN TOOL) ══════════

    /**
     * Completely reset an auction to its initial state
     * Useful for admin interventions - deletes all bids and resets everything
     */
    @Transactional
    public void resetAuction(Long auctionId) {
        Auction auction = auctionRepository.findById(auctionId)
                .orElseThrow(() -> new RuntimeException("Auction not found"));

        Property property = auction.getProperty();

        // Delete all bids
        List<Bid> oldBids = bidRepository.findByAuction(auction);
        if (!oldBids.isEmpty()) {
            bidRepository.deleteAll(oldBids);
            System.out.println("🗑️ Deleted " + oldBids.size() + " bids from auction #" + auctionId);
        }

        // Delete bid history
        bidHistoryRepository.deleteByAuctionId(auctionId);
        System.out.println("��️ Cleared bid history for auction #" + auctionId);

        // Clear auction bids collection
        auction.getBids().clear();

        // Reset auction state
        auction.setHighestBidder(null);
        auction.setCurrentPrice(auction.getStartingPrice());
        auction.setPaymentDeadline(null);
        auction.setCurrentPaymentStatus(null);
        auction.setCurrentAttempt(1);
        auction.setFailedPayerUsername(null);
        auction.setFailedPaymentTime(null);
        auction.setSellerNotified(false);
        auction.setStatus("ACTIVE");

        // Set new end time based on property duration
        LocalDateTime now = LocalDateTime.now();
        auction.setStartTime(now);

        if (property != null) {
            int duration = property.getDuration() != null ? property.getDuration() : 7;
            auction.setEndTime(duration == 0 ? now.plusMinutes(1) : now.plusDays(duration));

            // CRITICAL: Reset property to ACTIVE
            property.setListingStatus(ListingStatus.ACTIVE);

            property.setAutoRelisted(false);
            propertyRepository.save(property);
        } else {
            auction.setEndTime(now.plusDays(7)); // Default 7 days
        }

        auctionRepository.save(auction);

        System.out.println("🔄 Auction #" + auctionId + " completely reset by admin. " +
                "Property: " + (property != null ? property.getTitle() : "Unknown") + " is now ACTIVE.");
    }
}