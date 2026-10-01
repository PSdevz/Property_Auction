package com.ps515.auctionbackend.repository;

import com.ps515.auctionbackend.model.Auction;
import com.ps515.auctionbackend.model.Property;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface AuctionRepository extends JpaRepository<Auction, Long> {



    @Query("SELECT DISTINCT a FROM Auction a " +
            "LEFT JOIN FETCH a.property p " +
            "LEFT JOIN FETCH p.seller " +
            "WHERE a.status = :status AND a.endTime < :now")
    List<Auction> findByStatusAndEndTimeBefore(@Param("status") String status, @Param("now") LocalDateTime now);

    @Query("SELECT DISTINCT a FROM Auction a " +
            "LEFT JOIN FETCH a.property p " +
            "LEFT JOIN FETCH p.seller " +
            "WHERE a.status = :status AND a.paymentDeadline < :now")
    List<Auction> findByStatusAndPaymentDeadlineBefore(@Param("status") String status, @Param("now") LocalDateTime now);

    @Query("SELECT DISTINCT a FROM Auction a " +
            "LEFT JOIN FETCH a.property p " +
            "LEFT JOIN FETCH p.seller " +
            "WHERE a.currentPaymentStatus = :paymentStatus")
    List<Auction> findByCurrentPaymentStatus(@Param("paymentStatus") String paymentStatus);

    @Query("SELECT DISTINCT a FROM Auction a " +
            "LEFT JOIN FETCH a.property p " +
            "LEFT JOIN FETCH p.seller " +
            "WHERE a.currentPaymentStatus = :paymentStatus AND a.paymentDeadline BETWEEN :start AND :end")
    List<Auction> findByPaymentStatusAndDeadlineBetween(@Param("paymentStatus") String paymentStatus, @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT DISTINCT a FROM Auction a " +
            "LEFT JOIN FETCH a.property p " +
            "LEFT JOIN FETCH p.seller " +
            "WHERE a.currentPaymentStatus = :paymentStatus AND a.paymentDeadline < :now")
    List<Auction> findOverduePayments(@Param("paymentStatus") String paymentStatus, @Param("now") LocalDateTime now);

    Auction findByProperty(Property property);




    List<Auction> findByStatus(String status);



    @Query("SELECT DISTINCT a FROM Auction a " +
            "LEFT JOIN FETCH a.property p " +
            "LEFT JOIN FETCH p.seller " +
            "WHERE a.status = :status AND a.highestBidder = :username")
    List<Auction> findByStatusAndHighestBidder(@Param("status") String status, @Param("username") String username);


}