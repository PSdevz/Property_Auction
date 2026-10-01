package com.ps515.auctionbackend.controller;

import com.ps515.auctionbackend.model.Bid;
import com.ps515.auctionbackend.model.Property;
import com.ps515.auctionbackend.model.Auction;
import com.ps515.auctionbackend.model.User;
import com.ps515.auctionbackend.model.AutoBid;
import com.ps515.auctionbackend.repository.PropertyRepository;
import com.ps515.auctionbackend.repository.AuctionRepository;
import com.ps515.auctionbackend.repository.UserRepository;
import com.ps515.auctionbackend.repository.WatchlistRepository;
import com.ps515.auctionbackend.repository.AutoBidRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.ps515.auctionbackend.model.ListingStatus;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/properties")
@CrossOrigin(origins = "http://localhost:3000")
public class PropertyController {

    @Autowired
    private PropertyRepository propertyRepository;

    @Autowired
    private AuctionRepository auctionRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private WatchlistRepository watchlistRepository;

    @Autowired
    private AutoBidRepository autoBidRepository;

    /** Add a property and automatically create an auction */
    @PostMapping("/add")
    public ResponseEntity<?> addProperty(@RequestBody Property property) {
        try {
            // Block suspended sellers
            Optional<User> sellerOpt = userRepository.findByUsername(property.getSellerUsername());

            if (sellerOpt.isEmpty()) {
                return ResponseEntity.status(404).body("Seller user not found");
            }

            User seller = sellerOpt.get();

            if (Boolean.TRUE.equals(seller.getSuspended())) {
                return ResponseEntity.status(403)
                        .body("Your account is suspended. You cannot create new listings.");
            }

            // Validate City and Postcode
            if (property.getCity() == null || property.getCity().isBlank()) {
                return ResponseEntity.badRequest().body("City is required");
            }
            if (property.getPostcode() == null || property.getPostcode().isBlank()) {
                return ResponseEntity.badRequest().body("Postcode is required");
            }

            property.setListingStatus(ListingStatus.ACTIVE);


            property.setSeller(seller);

            Property savedProperty = propertyRepository.save(property);

            Auction newAuction = new Auction();
            newAuction.setProperty(savedProperty);
            newAuction.setReservePrice(savedProperty.getReservePrice());
            newAuction.setStartingPrice(savedProperty.getReservePrice());
            newAuction.setCurrentPrice(savedProperty.getReservePrice());
            newAuction.setStatus("ACTIVE");

            LocalDateTime now = LocalDateTime.now();
            newAuction.setStartTime(now);

            if (savedProperty.getDuration() != null && savedProperty.getDuration() == 0) {
                newAuction.setEndTime(now.plusMinutes(1));
            } else {
                int durationDays = (savedProperty.getDuration() != null && savedProperty.getDuration() > 0)
                        ? savedProperty.getDuration() : 7;
                newAuction.setEndTime(now.plusDays(durationDays));
            }

            auctionRepository.save(newAuction);

            return ResponseEntity.ok(savedProperty);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Failed to add property");
        }
    }

    // ══════════════════════════════════════════════════════════
    // TEMPORARY: One-time migration endpoint to fix existing properties
    // ══════════════════════════════════════════════════════════
    @PostMapping("/admin/fix-sellers")
    @Transactional
    public ResponseEntity<?> fixMissingSellers() {
        try {
            List<Property> allProperties = propertyRepository.findAll();
            int fixed = 0;
            int failed = 0;

            for (Property property : allProperties) {
                // If seller relationship is null but sellerUsername exists
                if (property.getSeller() == null && property.getSellerUsername() != null) {
                    Optional<User> sellerOpt = userRepository.findByUsername(property.getSellerUsername());

                    if (sellerOpt.isPresent()) {
                        property.setSeller(sellerOpt.get());
                        propertyRepository.save(property);
                        fixed++;
                        System.out.println("Fixed property #" + property.getId() +
                                " - linked to seller: " + property.getSellerUsername());
                    } else {
                        failed++;
                        System.err.println("⚠️ Property #" + property.getId() +
                                " has seller username '" + property.getSellerUsername() +
                                "' but user not found!");
                    }
                }
            }

            return ResponseEntity.ok(Map.of(
                    "message", "Migration completed",
                    "fixed", fixed,
                    "failed", failed
            ));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Migration failed: " + e.getMessage());
        }
    }

    @GetMapping("/stats/global")
    public ResponseEntity<Map<String, Object>> getGlobalStats() {
        Map<String, Object> stats = new HashMap<>();

        // 1. Calculate Active Auctions
        long activeAuctions = propertyRepository.countByListingStatus(ListingStatus.ACTIVE);

        // 2. Calculate Properties Sold
        long propertiesSold = propertyRepository.countByListingStatus(ListingStatus.SOLD);

        // 3. Calculate Total Users
        long totalUsers = userRepository.count();

        // 4. Calculate Total Bids
        long totalBids = auctionRepository.findAll().stream()
                .mapToLong(a -> a.getBids() != null ? a.getBids().size() : 0)
                .sum();

        stats.put("activeAuctions", activeAuctions);
        stats.put("propertiesSold", propertiesSold);
        stats.put("totalUsers", totalUsers);
        stats.put("totalBids", totalBids);

        return ResponseEntity.ok(stats);
    }

    /** Get properties for a specific seller */
    @GetMapping("/seller/{username}")
    public ResponseEntity<List<Property>> getPropertiesBySeller(@PathVariable String username) {
        return ResponseEntity.ok(propertyRepository.findBySellerUsername(username));
    }

    @GetMapping("/active/recent")
    public List<Property> getRecentActiveProperties() {
        return propertyRepository.findAll()
                .stream()
                .filter(p -> p.getListingStatus() == ListingStatus.ACTIVE)
                .sorted(Comparator.comparing(Property::getId).reversed())
                .limit(6)
                .toList();
    }

    /** Update the listing status — blocked for suspended sellers */
    @PutMapping("/{propertyId}/status")
    @Transactional
    public ResponseEntity<?> updateListingStatus(
            @PathVariable Long propertyId,
            @RequestParam String status
    ) {
        try {
            ListingStatus newStatus = ListingStatus.valueOf(status.toUpperCase().trim());

            return propertyRepository.findById(propertyId)
                    .map(property -> {
                        Optional<User> sellerOpt = userRepository.findByUsername(property.getSellerUsername());
                        if (sellerOpt.isPresent() && Boolean.TRUE.equals(sellerOpt.get().getSuspended())) {
                            return ResponseEntity.status(403)
                                    .body("Your account is suspended. You cannot modify listings.");
                        }

                        property.setListingStatus(newStatus);

                        if (newStatus == ListingStatus.DEACTIVATED || newStatus == ListingStatus.SOLD || newStatus == ListingStatus.ENDED) {

                            // 1. Automatically wipe this property from everyone's watchlist
                            watchlistRepository.deleteByProperty(property);

                            // 2. Sync the Auction status
                            Auction auction = auctionRepository.findByProperty(property);
                            if (auction != null) {

                                // Update the auction string status to match
                                if (newStatus == ListingStatus.DEACTIVATED) {
                                    auction.setStatus("CANCELLED");
                                } else if (newStatus == ListingStatus.SOLD) {
                                    auction.setStatus("SOLD");
                                } else {
                                    auction.setStatus("ENDED");
                                }

                                // If it's being closed manually before the timer runs out
                                if (auction.getEndTime().isAfter(LocalDateTime.now())) {
                                    auction.setEndTime(LocalDateTime.now());
                                }

                                auctionRepository.save(auction);
                            }
                        }
                        propertyRepository.save(property);
                        return ResponseEntity.ok().build();
                    })
                    .orElse(ResponseEntity.notFound().build());

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("Invalid status value: " + status);
        }
    }

    /** Search properties by term */
    @GetMapping("/search")
    public List<Property> searchProperties(@RequestParam(required = false) String term) {
        if (term == null || term.trim().isEmpty()) {
            return propertyRepository.findByListingStatus(ListingStatus.ACTIVE);
        }
        return propertyRepository.searchActiveProperties(term);
    }

    /** Delete a property — blocked for suspended sellers */
    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> deleteProperty(@PathVariable Long id) {
        Property property = propertyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Property not found"));

        Optional<User> sellerOpt = userRepository.findByUsername(property.getSellerUsername());
        if (sellerOpt.isPresent() && Boolean.TRUE.equals(sellerOpt.get().getSuspended())) {
            return ResponseEntity.status(403)
                    .body("Your account is suspended. You cannot delete listings.");
        }

        Auction auction = auctionRepository.findByProperty(property);
        if (auction != null && !auction.getBids().isEmpty()) {
            return ResponseEntity.badRequest()
                    .body("Cannot delete property: there are active bids on this auction.");
        }

        if (auction != null) auctionRepository.delete(auction);

        // Remove from watchlists
        watchlistRepository.deleteByProperty(property);

        propertyRepository.delete(property);

        return ResponseEntity.noContent().build();
    }

    /** Get all active properties */
    @GetMapping("/active")
    public List<Property> getActiveProperties() {
        List<Property> allActive = propertyRepository.findByListingStatus(ListingStatus.ACTIVE);

        return allActive.stream()
                .filter(property -> {
                    // 1. If there's no auction, it's not suspended, so show it.
                    if (property.getAuction() == null) {
                        return true;
                    }

                    // 2. USE 'get' instead of 'is'
                    // 3. Add 'Boolean.TRUE.equals' for total safety against nulls in the DB
                    return !Boolean.TRUE.equals(property.getAuction().getSuspendedBySellerStatus());
                })
                .collect(Collectors.toList());
    }

    /** Featured properties with auction data for landing page */
    @GetMapping("/featured")
    public ResponseEntity<List<Map<String, Object>>> getFeaturedProperties() {
        try {
            List<Property> activeProps = propertyRepository.findByListingStatus(ListingStatus.ACTIVE);
            List<Map<String, Object>> result = new ArrayList<>();

            for (Property p : activeProps) {
                Map<String, Object> data = new HashMap<>();
                data.put("id", p.getId());
                data.put("title", p.getTitle());
                data.put("address", p.getAddress());
                data.put("city", p.getCity());
                data.put("postcode", p.getPostcode());
                data.put("reservePrice", p.getReservePrice());
                data.put("bedrooms", p.getBedrooms());
                data.put("bathrooms", p.getBathrooms());

                try {
                    Auction auction = auctionRepository.findByProperty(p);
                    if (auction != null) {
                        data.put("currentBid", auction.getCurrentPrice());
                        data.put("bidCount", auction.getBids() != null ? auction.getBids().size() : 0);
                        data.put("endTime", auction.getEndTime());
                        data.put("highestBidder", auction.getHighestBidder());
                    } else {
                        data.put("currentBid", 0);
                        data.put("bidCount", 0);
                        data.put("endTime", null);
                        data.put("highestBidder", null);
                    }
                } catch (Exception e) {
                    data.put("currentBid", 0);
                    data.put("bidCount", 0);
                    data.put("endTime", null);
                    data.put("highestBidder", null);
                }

                result.add(data);
            }

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.ok(new ArrayList<>());
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Property> getPropertyById(@PathVariable Long id) {
        return propertyRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /** Update property fields — blocked for suspended sellers and properties with bids */
    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<?> updateProperty(@PathVariable Long id, @RequestBody Property updatedProperty) {
        return propertyRepository.findById(id).map(existingProperty -> {


            if (existingProperty.getSeller() == null && existingProperty.getSellerUsername() != null) {
                userRepository.findByUsername(existingProperty.getSellerUsername())
                        .ifPresent(seller -> {
                            existingProperty.setSeller(seller);
                            System.out.println("Auto-fixed seller relationship for property #" + id);
                        });
            }

            // 1. Update basic fields
            existingProperty.setTitle(updatedProperty.getTitle());
            existingProperty.setDescription(updatedProperty.getDescription());
            existingProperty.setAddress(updatedProperty.getAddress());
            existingProperty.setReservePrice(updatedProperty.getReservePrice());
            existingProperty.setBedrooms(updatedProperty.getBedrooms());
            existingProperty.setBathrooms(updatedProperty.getBathrooms());
            existingProperty.setReceptions(updatedProperty.getReceptions());
            existingProperty.setDuration(updatedProperty.getDuration());

            // 2. Update the split location fields
            existingProperty.setCity(updatedProperty.getCity());
            existingProperty.setPostcode(updatedProperty.getPostcode());

            // 3. Update Images
            existingProperty.setMainImage(updatedProperty.getMainImage());
            existingProperty.setImages(updatedProperty.getImages());

            // 4. SYNC THE AUCTION
            Auction auction = existingProperty.getAuction();
            if (auction != null) {
                LocalDateTime start = (existingProperty.getStartDate() != null)
                        ? existingProperty.getStartDate()
                        : LocalDateTime.now();

                if (updatedProperty.getDuration() != null && updatedProperty.getDuration() == 0) {
                    auction.setEndTime(start.plusMinutes(1));
                } else if (updatedProperty.getDuration() != null) {
                    auction.setEndTime(start.plusDays(updatedProperty.getDuration()));
                }

                // Reactivate if the new time is in the future
                if (auction.getEndTime().isAfter(LocalDateTime.now())) {
                    auction.setStatus("ACTIVE");
                    existingProperty.setListingStatus(ListingStatus.ACTIVE);
                    auction.setHighestBidder(null);
                }
            }

            propertyRepository.save(existingProperty);
            return ResponseEntity.ok(existingProperty);
        }).orElse(ResponseEntity.notFound().build());
    }

    /** Place bid — blocked for suspended buyers */
    @PostMapping("/auctions/{auctionId}/bid")
    @Transactional
    public ResponseEntity<?> placeBid(
            @PathVariable Long auctionId,
            @RequestBody Bid bidRequest) {

        Optional<User> buyerOpt = userRepository.findByUsername(bidRequest.getBidderUsername());
        if (buyerOpt.isPresent() && Boolean.TRUE.equals(buyerOpt.get().getSuspended())) {
            return ResponseEntity.status(403)
                    .body("Your account is suspended. You cannot place bids.");
        }

        Auction auction = auctionRepository.findById(auctionId)
                .orElseThrow(() -> new RuntimeException("Auction not found"));

        if (bidRequest.getAmount() <= auction.getCurrentPrice()) {
            return ResponseEntity.badRequest().body("Bid must be higher than current highest bid");
        }

        // 1. Process the Human Bid
        bidRequest.setAuction(auction);
        bidRequest.setBidTime(LocalDateTime.now());

        auction.getBids().add(bidRequest);
        auction.setCurrentPrice(bidRequest.getAmount());
        auction.setHighestBidder(bidRequest.getBidderUsername());

        // 2. Wake up the bots
        processAutoBids(auction);

        // 3. Save the final state
        auctionRepository.save(auction);

        return ResponseEntity.ok("Bid placed successfully");
    }

    // ==========================================
    // 🤖 AUTO-BID ENGINE
    // ==========================================
    @Transactional
    public void processAutoBids(Auction auction) {
        boolean activeWar = true;
        int safetyLimit = 100;

        while (activeWar && safetyLimit > 0) {
            activeWar = false;
            safetyLimit--;

            List<AutoBid> activeBots = autoBidRepository.findByAuctionIdAndActiveTrue(auction.getAuctionId());
            if (activeBots.isEmpty()) break;

            AutoBid nextBot = null;
            double currentBid = auction.getCurrentPrice();
            String currentLeader = auction.getHighestBidder();
            double highestMaxFound = 0;

            for (AutoBid bot : activeBots) {
                // If the bot has been outpriced, deactivate it
                if (bot.getMaxAmount() <= currentBid) {
                    bot.setActive(false);
                    autoBidRepository.save(bot);
                    continue;
                }

                // If this bot is already winning, skip it
                if (bot.getUsername().equals(currentLeader)) continue;

                // Find the eligible bot with the strongest max amount
                if (bot.getMaxAmount() > highestMaxFound) {
                    highestMaxFound = bot.getMaxAmount();
                    nextBot = bot;
                }
            }

            // If we found a bot ready to fight back
            if (nextBot != null) {
                double newBidAmount = currentBid + nextBot.getIncrementAmount();

                if (newBidAmount > nextBot.getMaxAmount()) {
                    newBidAmount = nextBot.getMaxAmount();
                }

                // Create the counter-bid
                Bid botBid = new Bid();
                botBid.setAmount(newBidAmount);
                botBid.setBidderUsername(nextBot.getUsername());
                botBid.setBidTime(LocalDateTime.now());
                botBid.setAuction(auction);

                auction.getBids().add(botBid);
                auction.setCurrentPrice(newBidAmount);
                auction.setHighestBidder(nextBot.getUsername());

                activeWar = true;
            }
        }
    }
}