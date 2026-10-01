package com.ps515.auctionbackend.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "auctions")
@Getter
@Setter
public class Auction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long auctionId;

    // ══════════════════════════════════════════════════════════
    // PROPERTY RELATIONSHIP
    // ══════════════════════════════════════════════════════════
    /**
     * EAGER FETCH: Ensures property (and its seller) are always loaded
     * This prevents LazyInitializationException when sending emails
     */
    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "property_id")
    @JsonBackReference
    private Property property;

    /**
     * If true, the automated penalty system (PaymentExpirationService)
     * will skip this auction, even if the deadline passes.
     */
    @Column(nullable = false)
    private Boolean manualOverride = false;
    // ══════════════════════════════════════════════════════════
    // AUCTION BASIC INFO
    // ══════════════════════════════════════════════════════════
    @Column(nullable = false)
    private Double startingPrice;

    @Column
    private Double reservePrice;

    @Column
    private Double currentPrice; // Replaces currentHighestBid for clarity

    @Column
    private String highestBidder;

    @Column
    private LocalDateTime startTime;

    @Column(nullable = false)
    private LocalDateTime endTime;

    // Inside Auction.java
    // Use Capital B 'Boolean' to prevent 500 errors with null values
    @Column(name = "suspended_by_seller_status")
    private Boolean suspendedBySellerStatus = false;

    // Update getter/setter to use Boolean as well
    public Boolean getSuspendedBySellerStatus() { return suspendedBySellerStatus; }
    public void setSuspendedBySellerStatus(Boolean suspendedBySellerStatus) {
        this.suspendedBySellerStatus = (suspendedBySellerStatus != null) ? suspendedBySellerStatus : false;
    }
    // Ensure it's capital 'B' Boolean


    /**
     * Auction Status:
     * - ACTIVE: Currently running
     * - ENDED: Finished, waiting for payment
     * - NO_BIDS: Ended with no bidders
     * - FAILED_PAYMENT: Winner(s) didn't pay
     * - COMPLETED: Payment received, auction successful
     * - CANCELLED: Manually cancelled by admin/seller
     */
    @Column(nullable = false)
    private String status = "ACTIVE";

    // ══════════════════════════════════════════════════════════
    // PAYMENT TRACKING
    // ══════════════════════════════════════════════════════════
    @Column
    private LocalDateTime paymentDeadline;

    /**
     * Payment Status:
     * - PENDING: Waiting for payment
     * - COMPLETED: Payment received
     * - EXPIRED: Deadline passed
     * - SECOND_CHANCE: Offered to underbidder
     * - FAILED: All attempts exhausted
     */
    @Column
    private String currentPaymentStatus;

    /**
     * Tracks which bidder is currently responsible for payment:
     * 1 = Winner (highest bidder)
     * 2 = Underbidder (second highest)
     * 3+ = Further fallback if needed
     */
    @Column
    private Integer currentAttempt = 1;

    // ══════════════════════════════════════════════════════════
    // FAILURE TRACKING
    // ══════════════════════════════════════════════════════════
    @Column
    private String failedPayerUsername; // Who failed to pay (for records)

    @Column
    private LocalDateTime failedPaymentTime; // When they failed

    @Column
    private Boolean sellerNotified = false; // Has seller been emailed about failure?

    // ══════════════════════════════════════════════════════════
    // BIDS RELATIONSHIP
    // ══════════════════════════════════════════════════════════
    @OneToMany(mappedBy = "auction", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<Bid> bids = new ArrayList<>();

    // ══════════════════════════════════════════════════════════
    // OPTIMISTIC LOCKING for race condition, keeps track of auction versions
    // ══════════════════════════════════════════════════════════
    @Version
    private Long version = 0L;

    // ══════════════════════════════════════════════════════════
    // HELPER METHODS
    // ══════════════════════════════════════════════════════════

    /**
     * Get current price safely (never null)
     */
    public Double getCurrentPrice() {
        return currentPrice != null ? currentPrice : (startingPrice != null ? startingPrice : 0.0);
    }

    /**
     * Legacy compatibility - redirects to getCurrentPrice()
     * @deprecated Use getCurrentPrice() instead
     */
    @Deprecated
    public Double getCurrentHighestBid() {
        return getCurrentPrice();
    }

    // Inside Auction.java
    @Column(name = "paused_remaining_seconds")
    private Long pausedRemainingSeconds;

    public Long getPausedRemainingSeconds() { return pausedRemainingSeconds; }
    public void setPausedRemainingSeconds(Long pausedRemainingSeconds) { this.pausedRemainingSeconds = pausedRemainingSeconds; }

    /**
     * Check if reserve price was met
     */
    public boolean isReserveMet() {
        if (reservePrice == null) return true; // No reserve = always met
        return getCurrentPrice() >= reservePrice;
    }

    /**
     * Check if auction is currently active
     */
    public boolean isActive() {
        return "ACTIVE".equals(status) &&
                LocalDateTime.now().isBefore(endTime);
    }


    public Long getId(){
        return auctionId;
    }

}