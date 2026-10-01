package com.ps515.auctionbackend.controller;

import com.ps515.auctionbackend.model.Watchlist;
import com.ps515.auctionbackend.model.Property;
import com.ps515.auctionbackend.model.User;
import com.ps515.auctionbackend.repository.WatchlistRepository;
import com.ps515.auctionbackend.repository.PropertyRepository;
import com.ps515.auctionbackend.repository.UserRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/watchlist")
@CrossOrigin(origins = "http://localhost:3000")
public class WatchlistController {

    @Autowired
    private WatchlistRepository watchlistRepository;

    @Autowired
    private PropertyRepository propertyRepository;

    @Autowired
    private UserRepository userRepository;

    // Read-only — allowed even if suspended
    @GetMapping("/{username}")
    public ResponseEntity<List<Property>> getWatchlist(@PathVariable String username) {
        List<Watchlist> watchlistEntries = watchlistRepository.findByUsername(username);
        List<Property> properties = watchlistEntries.stream()
                .map(Watchlist::getProperty)
                .collect(Collectors.toList());
        return ResponseEntity.ok(properties);
    }

    // Read-only — allowed even if suspended
    @GetMapping("/{username}/check/{propertyId}")
    public ResponseEntity<Boolean> checkStatus(
            @PathVariable String username,
            @PathVariable Long propertyId) {
        return ResponseEntity.ok(
                watchlistRepository.existsByUsernameAndPropertyId(username, propertyId)
        );
    }

    @PostMapping("/{username}/add/{propertyId}")
    public ResponseEntity<?> addToWatchlist(
            @PathVariable String username,
            @PathVariable Long propertyId) {

        // Block suspended users from modifying watchlist
        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isPresent() && Boolean.TRUE.equals(userOpt.get().getSuspended())) {
            return ResponseEntity.status(403).body("Your account is suspended. You cannot modify your watchlist.");
        }

        if (watchlistRepository.existsByUsernameAndPropertyId(username, propertyId)) {
            return ResponseEntity.badRequest().body("Already in watchlist");
        }

        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new RuntimeException("Property not found"));

        Watchlist watchlist = new Watchlist();
        watchlist.setUsername(username);
        watchlist.setProperty(property);
        watchlistRepository.save(watchlist);

        return ResponseEntity.ok("Added to watchlist");
    }

    @DeleteMapping("/{username}/remove/{propertyId}")
    public ResponseEntity<?> removeFromWatchlist(
            @PathVariable String username,
            @PathVariable Long propertyId) {

        // Block suspended users from modifying watchlist
        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isPresent() && Boolean.TRUE.equals(userOpt.get().getSuspended())) {
            return ResponseEntity.status(403).body("Your account is suspended. You cannot modify your watchlist.");
        }

        watchlistRepository.findByUsernameAndPropertyId(username, propertyId)
                .ifPresent(watchlistRepository::delete);

        return ResponseEntity.ok("Removed from watchlist");
    }
}