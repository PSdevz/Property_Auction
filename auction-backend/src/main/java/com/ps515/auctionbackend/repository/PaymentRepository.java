package com.ps515.auctionbackend.repository;

import com.ps515.auctionbackend.model.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {

    List<Payment> findAllByAuctionIdAndBuyerUsername(Long auctionId, String buyerUsername);

    Optional<Payment> findByStripePaymentIntentId(String paymentIntentId);

    List<Payment> findByBuyerUsername(String username);

    // Delete only pending payments on user removal (completed records kept for audit)
    @Modifying
    @Query("DELETE FROM Payment p WHERE p.buyerUsername = :username AND p.status = :status")
    void deleteByBuyerUsernameAndStatus(@Param("username") String username,
                                        @Param("status") Payment.PaymentStatus status);
}