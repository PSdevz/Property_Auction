package com.ps515.auctionbackend.model;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "properties")
@Data
public class Property {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ══════════════════════════════════════════════════════════
    // LISTING STATUS
    // ══════════════════════════════════════════════════════════
    @Enumerated(EnumType.STRING)
    @Column(name = "listing_status", nullable = false)
    private ListingStatus listingStatus = ListingStatus.ACTIVE;

    // ══════════════════════════════════════════════════════════
    // BASIC PROPERTY INFO
    // ══════════════════════════════════════════════════════════
    @Column(nullable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private String address;

    @Column(nullable = false)
    private String city;

    @Column(nullable = false)
    private String postcode;

    // ══════════════════════════════════════════════════════════
    // PROPERTY DETAILS
    // ══════════════════════════════════════════════════════════
    @Column
    private Integer bedrooms;

    @Column
    private Integer bathrooms;

    @Column
    private Integer receptions;

    @Column(nullable = false)
    private Double reservePrice;

    // ══════════════════════════════════════════════════════════
    // SELLER INFORMATION
    // ══════════════════════════════════════════════════════════
    /**
     * Username of the seller (for backward compatibility and quick lookups)
     */
    @Column(nullable = false)
    private String sellerUsername;

    /**
     * Direct relationship to the seller User entity
     */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "seller_id", referencedColumnName = "userId")
    private User seller;

    // ══════════════════════════════════════════════════════════
    // AUCTION TIMING
    // ══════════════════════════════════════════════════════════
    @Column
    private LocalDateTime startDate;

    /**
     * Stores the number of days the auction should run.
     * Defaulted to 7 days if not specified.
     */
    @Column
    private Integer duration = 7;

    // ══════════════════════════════════════════════════════════
    // AUCTION RELATIONSHIP
    // ══════════════════════════════════════════════════════════
    @OneToOne(mappedBy = "property", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private Auction auction;


    /**
     * If true, property was automatically relisted after payment failure
     */
    @Column
    private Boolean autoRelisted = false;

    // ══════════════════════════════════════════════════════════
    // IMAGES
    // ══════════════════════════════════════════════════════════
    /**
     * Main/featured image (Base64 string)
     * Kept for backward compatibility
     */
    @Lob
    @Column(columnDefinition = "LONGTEXT")
    private String mainImage;

    /**
     * Additional property images (Base64 strings)
     */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "property_images", joinColumns = @JoinColumn(name = "property_id"))
    @Column(name = "image_data", columnDefinition = "LONGTEXT")
    private List<String> images = new ArrayList<>();




}