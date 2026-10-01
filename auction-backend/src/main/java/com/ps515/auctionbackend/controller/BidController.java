package com.ps515.auctionbackend.controller;

import com.ps515.auctionbackend.repository.PropertyRepository;
import com.ps515.auctionbackend.model.Property;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bids")
public class BidController {

    private final PropertyRepository propertyRepository;

    public BidController(PropertyRepository propertyRepository) {
        this.propertyRepository = propertyRepository;
    }

    @GetMapping("/my-bids")
    public ResponseEntity<List<Property>> getMyBids(
            @RequestParam String username) {

        return ResponseEntity.ok(
                propertyRepository.findPropertiesByBidder(username)
        );
    }
}