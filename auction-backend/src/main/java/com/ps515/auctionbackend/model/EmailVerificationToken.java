package com.ps515.auctionbackend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
public class EmailVerificationToken {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;

    // This is the random UUID string we send in the email
    @Column(nullable = false, unique = true)
    private String token;

    // This links the token directly to the specific user signing up
    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // This ensures the link dies after 24 hours
    @Column(nullable = false)
    private LocalDateTime expiryDate;

    public EmailVerificationToken() {
    }

    public EmailVerificationToken(String token, User user) {
        this.token = token;
        this.user = user;
        this.expiryDate = LocalDateTime.now().plusHours(24);
    }

    // ══════════ GETTERS & SETTERS ══════════

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }





    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }


}