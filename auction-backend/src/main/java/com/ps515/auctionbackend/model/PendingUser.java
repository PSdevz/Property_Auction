package com.ps515.auctionbackend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "pending_users")
@Data
public class PendingUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password; // Already encrypted

    @Column(nullable = false)
    private String role;

    @Column(nullable = false, unique = true)
    private String verificationToken;

    @Column(nullable = false)
    private LocalDateTime expiryDate;

    public PendingUser() {
        this.expiryDate = LocalDateTime.now().plusHours(24); // Token expires in 24h
    }

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiryDate);
    }
}