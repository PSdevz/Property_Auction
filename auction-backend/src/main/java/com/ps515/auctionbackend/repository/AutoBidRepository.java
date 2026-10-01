package com.ps515.auctionbackend.repository;

import com.ps515.auctionbackend.model.AutoBid;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AutoBidRepository extends JpaRepository<AutoBid, Long> {

    List<AutoBid> findByAuctionIdAndActiveTrue(Long auctionId);

    Optional<AutoBid> findByUsernameAndAuctionId(String username, Long auctionId);

    List<AutoBid> findByUsernameAndActiveTrue(String username);

    void deleteByUsernameAndAuctionId(String username, Long auctionId);

    //Find all auto-bids by username (regardless of status)
    List<AutoBid> findByUsername(String username);
}