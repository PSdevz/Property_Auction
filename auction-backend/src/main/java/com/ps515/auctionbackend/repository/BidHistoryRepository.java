package com.ps515.auctionbackend.repository;

import com.ps515.auctionbackend.model.Auction;
import com.ps515.auctionbackend.model.BidHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BidHistoryRepository extends JpaRepository<BidHistory, Long> {

    // Find by username
    List<BidHistory> findByBidderUsernameOrderByTimestampDesc(String username);

    //Delete bid history for a specific auction
    void deleteByAuctionId(Long auctionId);


    List<BidHistory> findByAuctionId(Long auctionId);
    // Search activity @Query tells how to search
    @Query("SELECT bh FROM BidHistory bh WHERE " +
            "LOWER(bh.bidderUsername) LIKE LOWER(CONCAT('%', :search, '%')) " +
            "OR CAST(bh.auctionId AS string) LIKE CONCAT('%', :search, '%')")
    Page<BidHistory> searchActivity(@Param("search") String search, Pageable pageable);
}