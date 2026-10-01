package com.ps515.auctionbackend.controller;

import com.ps515.auctionbackend.model.*;
import com.ps515.auctionbackend.repository.*;
import com.ps515.auctionbackend.service.AdminService;
import com.ps515.auctionbackend.service.AuctionService;
import com.ps515.auctionbackend.service.PaymentExpirationService;
import com.ps515.auctionbackend.service.SuspensionService;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "http://localhost:3000")
public class AdminController {

    @Autowired private UserRepository userRepository;
    @Autowired private PropertyRepository propertyRepository;
    @Autowired private BidRepository bidRepository;
    @Autowired private PaymentRepository paymentRepository;
    @Autowired private AuctionRepository auctionRepository;
    @Autowired private BidHistoryRepository bidHistoryRepository;
    @Autowired private AdminService adminService;
    @Autowired private AuctionService auctionService;
    @Autowired private SuspensionService suspensionService;
    @Autowired private PaymentExpirationService paymentExpirationService;

    @PutMapping("/auctions/{id}/reactivate")
    public ResponseEntity<?> reactivate(@PathVariable Long id) {
        try {
            auctionService.reactivateAuction(id);
            return ResponseEntity.ok(Map.of("message", "Auction has been reset and is now LIVE again."));
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error resetting auction: " + e.getMessage());
        }
    }

    // ══════════════════════════════════════════════════════════
    // DASHBOARD STATS
    // ══════════════════════════════════════════════════════════
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getDashboardStats() {
        Map<String, Object> stats = new HashMap<>();
        List<User> allUsers = userRepository.findAll();
        List<Property> allProperties = propertyRepository.findAll();
        List<Payment> allPayments = paymentRepository.findAll();

        stats.put("totalUsers", allUsers.size());
        stats.put("totalBuyers", allUsers.stream().filter(u -> "BUYER".equalsIgnoreCase(u.getRole())).count());
        stats.put("totalSellers", allUsers.stream().filter(u -> "SELLER".equalsIgnoreCase(u.getRole())).count());
        stats.put("suspendedUsers", allUsers.stream().filter(u -> Boolean.TRUE.equals(u.getSuspended())).count());
        stats.put("totalProperties", allProperties.size());
        stats.put("activeListings", allProperties.stream().filter(p -> p.getListingStatus() == ListingStatus.ACTIVE).count());

        double totalRevenue = allPayments.stream()
                .filter(p -> p.getStatus() == Payment.PaymentStatus.COMPLETED)
                .mapToDouble(Payment::getDepositAmount).sum();

        stats.put("totalRevenue", totalRevenue);
        stats.put("totalBids", bidRepository.count());
        return ResponseEntity.ok(stats);
    }

    // ══════════════════════════════════════════════════════════
    // USER MANAGEMENT
    // ══════════════════════════════════════════════════════════

    @GetMapping("/users")
    public ResponseEntity<List<Map<String, Object>>> getAllUsers() {
        List<User> users = userRepository.findAll();
        List<Map<String, Object>> result = new ArrayList<>();

        for (User user : users) {
            Map<String, Object> userData = new HashMap<>();
            userData.put("id", user.getUserId());
            userData.put("username", user.getUsername());
            userData.put("email", user.getEmail());
            userData.put("role", user.getRole());
            userData.put("unpaidStrikes", user.getUnpaidStrikes() != null ? user.getUnpaidStrikes() : 0);
            userData.put("suspended", user.getSuspended() != null ? user.getSuspended() : false);
            userData.put("activeBids", user.getActiveBids() != null ? user.getActiveBids() : 0);
            result.add(userData);
        }
        return ResponseEntity.ok(result);
    }

    //SMART ROUTING, user.setSuspended(true) was called before suspensionService.suspendUserAndRollbackBids().
    @PutMapping("/users/{userId}/suspend")
    @Transactional
    public ResponseEntity<?> suspendUser(@PathVariable String userId) {
        try {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            if ("ADMIN".equalsIgnoreCase(user.getRole())) {
                return ResponseEntity.badRequest().body("Cannot suspend an Admin.");
            }

            // 1. Clear any old defaults FIRST, before changing state
            adminService.cleanupDefaultedAuctionsForUser(user.getUsername());

            // 2. SMART ROUTING: Call the specific services while the user is still 'active' in the DB
            if ("SELLER".equalsIgnoreCase(user.getRole())) {
                // Freeze their properties and cancel active auctions
                paymentExpirationService.suspendSellerAndHandleProperties(user.getUsername(), "Manually suspended by Administrator");

                // 3. Safely update the user state AFTER service calls
                user.setSuspended(true);
                userRepository.save(user);

                System.out.println("Admin suspended SELLER: " + user.getUsername());
                return ResponseEntity.ok("Seller " + user.getUsername() + " suspended and properties deactivated.");
            } else {
                // Roll back their bids as a buyer
                suspensionService.suspendUserAndRollbackBids(user.getUsername(), "Manually suspended by Administrator");

                // 3. Safely update the user state AFTER service calls
                user.setSuspended(true);
                userRepository.save(user);

                System.out.println("Admin suspended BUYER: " + user.getUsername());
                return ResponseEntity.ok("Buyer " + user.getUsername() + " suspended and active bids rolled back.");
            }
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    //SMART ROUTING IMPLEMENTED
    @PutMapping("/users/{userId}/unsuspend")
    @Transactional
    public ResponseEntity<?> unsuspendUser(@PathVariable String userId) {
        try {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // SMART ROUTING: Handle Sellers vs Buyers differently
            if ("SELLER".equalsIgnoreCase(user.getRole())) {
                // 1. Unfreeze properties and put them back on the market
                paymentExpirationService.unsuspendSellerAndRestoreProperties(user.getUsername());

                // 2. Safely update the user state AFTER service calls
                user.setSuspended(false);
                user.setUnpaidStrikes(2);
                userRepository.save(user);

                System.out.println("Admin unsuspended SELLER: " + user.getUsername());
                return ResponseEntity.ok("Seller " + user.getUsername() + " unsuspended (2/3 strikes) and properties restored.");
            } else {
                // 1. Clean up defaulted auctions
                adminService.cleanupDefaultedAuctionsForUser(user.getUsername());

                // 2. Call the unsuspend service FIRST (so it doesn't trip the "already unsuspended" exception)
                paymentExpirationService.unsuspendUser(user.getUsername(), "Manually unsuspended by Administrator");

                // 3. Safely update the user state AFTER service calls
                user.setSuspended(false);
                user.setUnpaidStrikes(2);
                userRepository.save(user);

                System.out.println("Admin unsuspended BUYER: " + user.getUsername());
                return ResponseEntity.ok("Buyer " + user.getUsername() + " unsuspended (2/3 strikes).");
            }
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    @DeleteMapping("/users/{userId}")
    @Transactional
    public ResponseEntity<?> deleteUser(@PathVariable String userId) {
        try {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            if ("ADMIN".equalsIgnoreCase(user.getRole())) {
                return ResponseEntity.badRequest().body("Cannot delete Admin.");
            }

            adminService.cleanupDefaultedAuctionsForUser(user.getUsername());
            userRepository.delete(user);

            System.out.println("Admin deleted user: " + user.getUsername());
            return ResponseEntity.ok("User removed from system.");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    @DeleteMapping("/properties/{propertyId}")
    @Transactional
    public ResponseEntity<?> deleteProperty(@PathVariable Long propertyId) {
        try {
            Property property = propertyRepository.findById(propertyId)
                    .orElseThrow(() -> new RuntimeException("Property not found"));

            Auction auction = auctionRepository.findByProperty(property);

            if (auction != null) {
                List<Bid> bids = bidRepository.findByAuction(auction);
                if (!bids.isEmpty()) {
                    bidRepository.deleteAll(bids);
                }
                auctionRepository.delete(auction);
            }

            propertyRepository.delete(property);

            System.out.println("Admin permanently deleted property #" + propertyId);
            return ResponseEntity.ok("Property deleted successfully.");

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body("Error deleting property: " + e.getMessage());
        }
    }

    // ══════════════════════════════════════════════════════════
    // PROPERTY & AUCTION STATUS MANAGEMENT
    // ══════════════════════════════════════════════════════════

    @PutMapping("/properties/{propertyId}/status")
    @Transactional
    public ResponseEntity<?> changePropertyStatus(
            @PathVariable Long propertyId,
            @RequestParam String status) {
        try {
            Property property = propertyRepository.findById(propertyId)
                    .orElseThrow(() -> new RuntimeException("Property not found"));

            ListingStatus newStatus = ListingStatus.valueOf(status.toUpperCase());
            Auction auction = auctionRepository.findByProperty(property);

            if (auction != null) {
                if (newStatus == ListingStatus.ACTIVE) {

                    if (auction.getPausedRemainingSeconds() != null) {
                        LocalDateTime now = LocalDateTime.now();
                        if (auction.getPausedRemainingSeconds() > 0) {
                            auction.setEndTime(now.plusSeconds(auction.getPausedRemainingSeconds()));
                        } else {
                            auction.setEndTime(now.plusDays(7));
                        }
                        auction.setPausedRemainingSeconds(null);
                        auction.setStatus("ACTIVE");
                        auction.setManualOverride(false);
                        auction.setHighestBidder(null);
                        auction.setCurrentPrice(auction.getStartingPrice());
                        auction.getBids().clear();

                        auctionRepository.save(auction);
                        property.setListingStatus(ListingStatus.ACTIVE);
                        propertyRepository.save(property);
                    } else {
                        adminService.resetAuction(auction.getAuctionId());
                        property.setListingStatus(ListingStatus.ACTIVE);
                        propertyRepository.save(property);
                    }

                } else if (newStatus == ListingStatus.ENDED) {

                    auction.setStatus("ENDED");
                    auction.setPaymentDeadline(LocalDateTime.now().minusMinutes(1));
                    property.setListingStatus(ListingStatus.ENDED);
                    auctionRepository.save(auction);
                    propertyRepository.save(property);

                } else if (newStatus == ListingStatus.DEACTIVATED || status.equalsIgnoreCase("CANCELLED")) {

                    // 1. FREEZE THE CLOCK
                    LocalDateTime now = LocalDateTime.now();
                    if (auction.getEndTime() != null && auction.getEndTime().isAfter(now)) {
                        long remainingSeconds = java.time.temporal.ChronoUnit.SECONDS.between(now, auction.getEndTime());
                        auction.setPausedRemainingSeconds(remainingSeconds);
                    } else {
                        auction.setPausedRemainingSeconds(0L);
                    }

                    // 2.EMAIL NOTIFICATION LOGIC (Before deleting bids!)
                    List<Bid> bids = bidRepository.findByAuction(auction);
                    if (!bids.isEmpty()) {
                        // Identify unique buyers
                        Set<String> affectedBuyers = new HashSet<>();
                        for (Bid b : bids) {
                            if (b.getBidderUsername() != null) {
                                affectedBuyers.add(b.getBidderUsername());
                            }
                        }

                        // Send the emails using the service method
                        for (String buyerUsername : affectedBuyers) {
                            paymentExpirationService.notifyBuyerBidCancelled(buyerUsername, property.getTitle());
                        }

                        // 3. Clear active bids
                        bidRepository.deleteAll(bids);
                    }

                    // 4. Clear history and reset stats
                    List<BidHistory> history = bidHistoryRepository.findByAuctionId(auction.getAuctionId());
                    if (!history.isEmpty()) {
                        bidHistoryRepository.deleteAll(history);
                    }

                    auction.setHighestBidder(null);
                    auction.setCurrentPrice(auction.getStartingPrice());
                    auction.getBids().clear();
                    auction.setStatus("DEACTIVATED");
                    property.setListingStatus(ListingStatus.DEACTIVATED);

                    auctionRepository.save(auction);
                    propertyRepository.save(property);
                    System.out.println("Admin manually deactivated property #" + propertyId + " and notified buyers.");
                }
            } else {
                property.setListingStatus(newStatus);
                propertyRepository.save(property);
            }

            return ResponseEntity.ok("Property status updated to: " + status.toUpperCase());

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    // ══════════════════════════════════════════════════════════
    // OPTIONAL: MANUAL AUCTION RESET
    // ══════════════════════════════════════════════════════════

    @PostMapping("/auctions/{auctionId}/reset")
    @Transactional
    public ResponseEntity<?> resetAuction(@PathVariable Long auctionId) {
        try {
            adminService.resetAuction(auctionId);
            return ResponseEntity.ok("Auction #" + auctionId + " has been completely reset.");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    @PostMapping("/auctions/cleanup-all")
    @Transactional
    public ResponseEntity<?> cleanupAllDefaultedAuctions() {
        try {
            int count = adminService.cleanupAllDefaultedAuctions();
            return ResponseEntity.ok("Cleaned up " + count + " defaulted auctions.");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    // ══════════════════════════════════════════════════════════
    // FINANCIALS & ACTIVITY
    // ══════════════════════════════════════════════════════════

    @GetMapping("/properties")
    public ResponseEntity<List<Property>> getAllProperties() {
        return ResponseEntity.ok(propertyRepository.findAll());
    }

    @GetMapping("/payments")
    public ResponseEntity<List<Payment>> getAllPayments() {
        return ResponseEntity.ok(paymentRepository.findAll());
    }

    @GetMapping("/activity")
    public ResponseEntity<Page<BidHistory>> getLatestActivity(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(adminService.getFilteredActivity(page, size, search));
    }

    // ══════════════════════════════════════════════════════════
    // EXTRA UTILITIES
    // ══════════════════════════════════════════════════════════

    @PostMapping("/reset-strikes/{username}")
    public ResponseEntity<String> resetStrikes(@PathVariable String username) {
        try {
            paymentExpirationService.resetStrikes(username);
            return ResponseEntity.ok("Strikes reset to 0.");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }
}