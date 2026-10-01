package com.ps515.auctionbackend.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Table(name = "auto_bid", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"username", "auctionId"})
})
@Data
public class AutoBid {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String username;

    @Column(nullable = false)
    private Long auctionId;

    @Column(nullable = false)
    private double maxAmount;

    @Column(nullable = false)
    private double incrementAmount;

    @Column(nullable = false)
    private boolean active = true;
}