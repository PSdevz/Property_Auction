package com.ps515.auctionbackend.repository;

import com.ps515.auctionbackend.model.Property;
import com.ps515.auctionbackend.model.ListingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PropertyRepository extends JpaRepository<Property, Long> {

    /**
     * Searches only ACTIVE listings by title, address, or location.
     * Used for the main Property Search page.
     */
    @Query("SELECT p FROM Property p WHERE p.listingStatus = 'ACTIVE' AND " +
            "(LOWER(p.title) LIKE LOWER(CONCAT('%', :term, '%')) OR " +
            "LOWER(p.address) LIKE LOWER(CONCAT('%', :term, '%')) OR " +
            "LOWER(p.city) LIKE LOWER(CONCAT('%', :term, '%')) OR " +
            "LOWER(p.postcode) LIKE LOWER(CONCAT('%', :term, '%')))")
    List<Property> searchActiveProperties(@Param("term") String term);

    /**
     * Finds all properties that a specific user has placed a bid on.
     */
    @Query("SELECT DISTINCT p FROM Property p JOIN p.auction a JOIN a.bids b WHERE b.bidderUsername = :username")
    List<Property> findPropertiesByBidder(@Param("username") String username);

    /**
     * Finds all properties associated with a specific seller username.
     * Used for the Seller Dashboard table.
     */
    List<Property> findBySellerUsername(String username);

    /**
     * Finds properties by listing status (e.g., ACTIVE, SOLD, ENDED).
     */
    List<Property> findByListingStatus(ListingStatus listingStatus);

    /**
     * for Global Stats
     * Counts properties by status (e.g., how many are 'SOLD')
     */
    long countByListingStatus(ListingStatus listingStatus);



}