package com.ps515.auctionbackend.repository;

import com.ps515.auctionbackend.model.Auction;
import com.ps515.auctionbackend.model.Bid;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BidRepository extends JpaRepository<Bid, Long> {

    // Find all bids for a specific auction
    List<Bid> findByAuction(Auction auction);

    // Find next best bidder (excluding the defaulted user)
    Optional<Bid> findTopByAuctionAndBidderUsernameNotOrderByAmountDesc(
            Auction auction,
            String excludeUsername
    );

    // Count active bids by user
    @Query("SELECT COUNT(DISTINCT b.auction.auctionId) FROM Bid b " +
            "WHERE b.bidderUsername = :username " +
            "AND b.auction.status = 'ACTIVE'")
    Long countActiveBidsByUser(@Param("username") String username);

    // Find active bids by user
    @Query("SELECT b FROM Bid b WHERE b.bidderUsername = :username " +
            "AND b.auction.status = 'ACTIVE'")
    List<Bid> findActiveBidsByUser(@Param("username") String username);

    // Find all bids by user
    @Query("SELECT b FROM Bid b WHERE b.bidderUsername = :username")
    List<Bid> findAllBidsByUser(@Param("username") String username);
}