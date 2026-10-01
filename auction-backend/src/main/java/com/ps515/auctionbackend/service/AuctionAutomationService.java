package com.ps515.auctionbackend.service;

import com.ps515.auctionbackend.model.Auction;
import com.ps515.auctionbackend.model.Bid;
import com.ps515.auctionbackend.model.ListingStatus;
import com.ps515.auctionbackend.model.Property;
import com.ps515.auctionbackend.repository.AuctionRepository;
import com.ps515.auctionbackend.repository.BidRepository;
import com.ps515.auctionbackend.repository.BidHistoryRepository;
import com.ps515.auctionbackend.repository.PropertyRepository;
import com.ps515.auctionbackend.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Service
public class AuctionAutomationService {

    @Autowired
    private AuctionRepository auctionRepository;

    @Autowired
    private PropertyRepository propertyRepository;

    @Autowired
    private BidRepository bidRepository;

    @Autowired
    private BidHistoryRepository bidHistoryRepository;

    @Autowired
    private UserRepository userRepository; // Needed to apply strikes

    @Scheduled(fixedRate = 60000)
    @Transactional
    public void processPaymentDeadlines() {
        LocalDateTime now = LocalDateTime.now();
        // catch BOTH first winners and underbidders because we use "PENDING"
        List<Auction> pendingAuctions = auctionRepository.findByCurrentPaymentStatus("PENDING");

        for (Auction auction : pendingAuctions) {
            if (auction.getPaymentDeadline() != null && now.isAfter(auction.getPaymentDeadline())) {
                handleDefault(auction);
            }
        }
    }

    private void handleDefault(Auction auction) {
        // 1. APPLY THE STRIKE TO THE FAILED PAYER
        String failedUser = auction.getHighestBidder();
        if (failedUser != null) {
            userRepository.findByUsername(failedUser).ifPresent(user -> {
                user.setUnpaidStrikes(user.getUnpaidStrikes() + 1);
                if (user.getUnpaidStrikes() >= 3) {
                    user.setSuspended(true);
                }
                userRepository.save(user);
                System.out.println(" Penalty applied: " + user.getUsername() + " now has " + user.getUnpaidStrikes() + " strikes.");
            });
        }

        // 2. ROUTE THE AUCTION
        if (auction.getCurrentAttempt() == 1) {
            moveToUnderbidder(auction);
        } else {
            relistProperty(auction);
        }
    }
    private void moveToUnderbidder(Auction auction) {
        String failedBidder = auction.getHighestBidder();
        System.out.println("DEBUG: moveToUnderbidder called. Failed bidder: " + failedBidder);

        if (failedBidder == null) {
            System.out.println("DEBUG: failedBidder is null, relisting");
            relistProperty(auction);
            return;
        }

        // Query BidHistory
        List<com.ps515.auctionbackend.model.BidHistory> allHistory = bidHistoryRepository.findByAuctionId(auction.getAuctionId());
        System.out.println("DEBUG: Found " + allHistory.size() + " bid history entries for auction #" + auction.getAuctionId());
        allHistory.forEach(h -> System.out.println("  - " + h.getBidderUsername() + ": £" + h.getAmount()));

        Optional<com.ps515.auctionbackend.model.BidHistory> trueUnderbidder = allHistory.stream()
                .filter(h -> h.getBidderUsername() != null && !h.getBidderUsername().equalsIgnoreCase(failedBidder))
                .max(Comparator.comparing(com.ps515.auctionbackend.model.BidHistory::getAmount));

        if (trueUnderbidder.isPresent()) {
            com.ps515.auctionbackend.model.BidHistory underbidder = trueUnderbidder.get();
            System.out.println("DEBUG: Underbidder found: " + underbidder.getBidderUsername() + " with bid £" + underbidder.getAmount());

            // Record the failed payer
            auction.setFailedPayerUsername(failedBidder);
            auction.setFailedPaymentTime(LocalDateTime.now());

            // Move to underbidder
            auction.setHighestBidder(underbidder.getBidderUsername());
            auction.setCurrentPrice(underbidder.getAmount());
            auction.setPaymentDeadline(LocalDateTime.now().plusMinutes(1));
            auction.setCurrentAttempt(2);
            auction.setCurrentPaymentStatus("PENDING");

            System.out.println("DEBUG: Updated auction - highestBidder: " + auction.getHighestBidder() + ", currentPrice: " + auction.getCurrentPrice());

            // Clean up old bids
            List<Bid> liveBids = bidRepository.findByAuction(auction);
            List<Bid> bidsToRemove = liveBids.stream()
                    .filter(b -> failedBidder.equalsIgnoreCase(b.getBidderUsername()))
                    .toList();

            if (!bidsToRemove.isEmpty()) {
                System.out.println("DEBUG: Removing " + bidsToRemove.size() + " bids from failed bidder");
                bidRepository.deleteAll(bidsToRemove);
                auction.getBids().removeAll(bidsToRemove);
            }

            // Create new bid for underbidder
            Bid underbidderBid = new Bid(underbidder.getAmount(), underbidder.getBidderUsername(), auction);
            bidRepository.save(underbidderBid);
            auction.getBids().add(underbidderBid);
            System.out.println("DEBUG: Created new bid for underbidder");

            // SAVE
            auctionRepository.save(auction);
            System.out.println("DEBUG: Auction saved. New highest bidder: " + auction.getHighestBidder());

        } else {
            System.out.println("DEBUG: No underbidder found, relisting property");
            relistProperty(auction);
        }
    }
    private void relistProperty(Auction auction) {
        Property property = auction.getProperty();

        // Delete active bids to reset the board
        List<Bid> oldBids = bidRepository.findByAuction(auction);
        if (!oldBids.isEmpty()) {
            bidRepository.deleteAll(oldBids);
            System.out.println(" Deleted " + oldBids.size() + " active bids from auction #" + auction.getAuctionId());
        }


        // Track the failure on the property
        if (property != null) {
            property.setAutoRelisted(true);
            property.setListingStatus(ListingStatus.ACTIVE);
        }

        // Reset auction to fresh state
        LocalDateTime now = LocalDateTime.now();
        auction.setStartTime(now);
        auction.setEndTime(now.plusDays(3));
        auction.setStatus("ACTIVE");
        auction.setCurrentPaymentStatus(null);
        auction.setPaymentDeadline(null);
        auction.setHighestBidder(null);
        auction.setCurrentPrice(auction.getStartingPrice());
        auction.setCurrentAttempt(1);
        auction.setFailedPayerUsername(null);
        auction.setFailedPaymentTime(null);

        // Clear the in-memory collection
        auction.getBids().clear();

        if (property != null) {
            propertyRepository.save(property);
        }
        auctionRepository.save(auction);
    }
}