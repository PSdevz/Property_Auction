package com.ps515.auctionbackend.repository;

import com.ps515.auctionbackend.model.PendingUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PendingUserRepository extends JpaRepository<PendingUser, Long> {
    Optional<PendingUser> findByVerificationToken(String token);
    Optional<PendingUser> findByUsername(String username);
    Optional<PendingUser> findByEmail(String email);

}