package com.ps515.auctionbackend.controller;

import com.ps515.auctionbackend.model.Property;
import com.ps515.auctionbackend.service.AuctionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/auctions")
@CrossOrigin(origins = "http://localhost:3000")
public class AuctionController {

    @Autowired
    private AuctionService auctionService;

    // Place bid
    @PostMapping("/{auctionId}/bid")
    public ResponseEntity<?> placeBid(
            @PathVariable Long auctionId,
            @RequestParam Double amount,
            @RequestParam String bidderUsername) {
        try {
            String result = auctionService.placeBid(auctionId, amount, bidderUsername);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            System.err.println("=== BID ERROR ===");
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body("Server error: " + e.getMessage());
        }
    }

    //ALL bids (active + ended) — used by BuyerDashboard
    @GetMapping("/users/{username}/bids")
    public ResponseEntity<List<Property>> getAllUserBids(
            @PathVariable String username) {
        try {

            List<Property> properties = auctionService.getAllBidsByUser(username);
            return ResponseEntity.ok(properties);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(null);
        }
    }

    // Active bids only (if needed separately)
    @GetMapping("/users/{username}/active-bids")
    public ResponseEntity<List<Property>> getActiveUserBids(
            @PathVariable String username) {
        try {
            List<Property> properties = auctionService.getActiveBidsByUser(username);
            return ResponseEntity.ok(properties);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(null);
        }
    }
}