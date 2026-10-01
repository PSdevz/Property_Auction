package com.ps515.auctionbackend.controller;

import com.ps515.auctionbackend.model.AutoBid;
import com.ps515.auctionbackend.model.User;
import com.ps515.auctionbackend.repository.AutoBidRepository;
import com.ps515.auctionbackend.repository.UserRepository;
import com.ps515.auctionbackend.service.AuctionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.transaction.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/autobid")
@CrossOrigin(origins = "http://localhost:3000")
public class AutoBidController {

    @Autowired
    private AutoBidRepository autoBidRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AuctionService auctionService;

    @PostMapping("/set")
    public ResponseEntity<?> setAutoBid(@RequestBody Map<String, Object> request) {
        String username = (String) request.get("username");
        Long auctionId = Long.valueOf(request.get("auctionId").toString());
        double maxAmount = Double.parseDouble(request.get("maxAmount").toString());
        double incrementAmount = Double.parseDouble(request.get("incrementAmount").toString());

        // Block suspended users
        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isPresent() && Boolean.TRUE.equals(userOpt.get().getSuspended())) {
            return ResponseEntity.status(403).body("Your account is suspended. You cannot set auto-bids.");
        }

        if (maxAmount <= 0 || incrementAmount <= 0) {
            return ResponseEntity.badRequest().body("Amounts must be positive.");
        }

        // ── Save or update the AutoBid record ────────────────────────────
        Optional<AutoBid> existing = autoBidRepository.findByUsernameAndAuctionId(username, auctionId);

        AutoBid autoBid;
        if (existing.isPresent()) {
            autoBid = existing.get();
            autoBid.setMaxAmount(maxAmount);
            autoBid.setIncrementAmount(incrementAmount);
            autoBid.setActive(true);
        } else {
            autoBid = new AutoBid();
            autoBid.setUsername(username);
            autoBid.setAuctionId(auctionId);
            autoBid.setMaxAmount(maxAmount);
            autoBid.setIncrementAmount(incrementAmount);
            autoBid.setActive(true);
        }

        autoBidRepository.save(autoBid);

        // ── Fire an immediate bid on behalf of this buyer ─────────────────
        // This places (currentHighestBid + increment) right away, or their
        // maxAmount if the increment would exceed it.
        try {
            String result = auctionService.placeAutoBidOnSetup(auctionId, username, incrementAmount, maxAmount);
            return ResponseEntity.ok("Auto-bid set. " + result);
        } catch (IllegalArgumentException e) {
            // e.g. already highest bidder, auction ended, etc. — still saved, just didn't fire
            return ResponseEntity.ok("Auto-bid saved. Note: " + e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.ok("Auto-bid saved, but could not place immediate bid: " + e.getMessage());
        }
    }

    @Transactional
    @DeleteMapping("/{username}/{auctionId}")
    public ResponseEntity<?> cancelAutoBid(@PathVariable String username, @PathVariable Long auctionId) {
        autoBidRepository.deleteByUsernameAndAuctionId(username, auctionId);
        return ResponseEntity.ok("Auto-bid cancelled.");
    }

    @GetMapping("/{username}/{auctionId}")
    public ResponseEntity<?> getAutoBid(@PathVariable String username, @PathVariable Long auctionId) {
        Optional<AutoBid> autoBid = autoBidRepository.findByUsernameAndAuctionId(username, auctionId);
        if (autoBid.isPresent() && autoBid.get().isActive()) {
            return ResponseEntity.ok(autoBid.get());
        }
        return ResponseEntity.ok(null);
    }

    @GetMapping("/user/{username}")
    public ResponseEntity<List<AutoBid>> getUserAutoBids(@PathVariable String username) {
        return ResponseEntity.ok(autoBidRepository.findByUsernameAndActiveTrue(username));
    }
}