package com.ps515.auctionbackend.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "bids")
@Getter
@Setter
public class Bid {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Double amount;

    private String bidderUsername;

    private LocalDateTime bidTime;

    @ManyToOne
    @JoinColumn(name = "auction_id")
    @JsonBackReference
    private Auction auction;

    // No-arg constructor (required by JPA)
    public Bid() {}


    public Double getAmount() {
        return amount;
    }

    //Constructor used in AuctionService.placeBid()
    public Bid(Double amount, String bidderUsername, Auction auction) {
        this.amount = amount;
        this.bidderUsername = bidderUsername;
        this.auction = auction;
        this.bidTime = LocalDateTime.now();
    }
}