package com.ps515.auctionbackend.repository;

import com.ps515.auctionbackend.model.Watchlist;
import com.ps515.auctionbackend.model.Property; // <-- 1. ADD THIS IMPORT
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.List;

public interface WatchlistRepository extends JpaRepository<Watchlist, Long> {

    List<Watchlist> findByUsername(String username);

    boolean existsByUsernameAndPropertyId(String username, Long propertyId);

    Optional<Watchlist> findByUsernameAndPropertyId(String username, Long propertyId);

    // Bulk delete all watchlist entries for a deleted user
    @Modifying
    @Query("DELETE FROM Watchlist w WHERE w.username = :username")
    void deleteByUsername(@Param("username") String username);


    // Automatically clears this property from everyone's watchlist when called
    void deleteByProperty(Property property);
}