package com.ps515.auctionbackend.model;

import com.fasterxml.jackson.annotation.JsonProperty; // 👈 Add this import
import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(name = "User")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @Column(name = "userId")
    private String userId;

    @Column(name = "username", unique = true, nullable = false)
    private String username;

    @Column(name = "password", nullable = false)
    private String password;

    @Column(name = "email", unique = true, nullable = false)
    private String email;

    @Column(name = "role", nullable = false)
    private String role;

    // 🏆 THE FIX: This ensures React sees "unpaidStrikes" exactly
    @JsonProperty("unpaidStrikes")
    @Column(name = "unpaidStrikes", nullable = false)
    private Integer unpaidStrikes = 0;

    // 🏆 THE FIX: This ensures React sees "suspended" exactly
    @JsonProperty("suspended")
    @Column(name = "suspended")
    private Boolean suspended = false;

    @JsonProperty("isEmailVerified")
    @Column(name = "isEmailVerified", nullable = false)
    private boolean isEmailVerified = false;

    @Transient
    private Long activeBids;

    @PrePersist
    public void generateUserId() {
        if (this.userId == null || this.userId.isEmpty()) {
            this.userId = UUID.randomUUID().toString();
        }
    }

    // Since you're using @Data, you don't need manual getters/setters
    // for isEmailVerified unless you have custom logic.
    // Lombok handles it automatically!

    public User(String username, String password, String email, String role) {
        this.username = username;
        this.password = password;
        this.email = email;
        this.role = role;
        this.unpaidStrikes = 0;
        this.suspended = false;
        this.isEmailVerified = false;
    }
}