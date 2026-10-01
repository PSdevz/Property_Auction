package com.ps515.auctionbackend.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
public class Watchlist {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String username;

    @ManyToOne
    @JoinColumn(name = "property_id")
    private Property property;
}