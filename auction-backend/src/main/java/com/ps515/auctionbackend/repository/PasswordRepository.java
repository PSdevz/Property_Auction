package com.ps515.auctionbackend.repository;

import com.ps515.auctionbackend.model.PasswordReset;
import com.ps515.auctionbackend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PasswordRepository extends JpaRepository<PasswordReset, Long> {

    Optional<PasswordReset> findByToken(String token);

    Optional<PasswordReset> findByUser(User user);
}