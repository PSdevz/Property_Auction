import React, { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';
import Navbar from "../Navbar/Navbar";
import Footer from "../Footer/Footer";
import './PropertySearch.css';
import { useNavigate } from 'react-router-dom';

const calculateTimeLeft = (endTime) => {
    const difference = new Date(endTime) - new Date();
    if (difference <= 0) return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
    return {
        total: difference,
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / (1000 * 60)) % 60),
        seconds: Math.floor((difference / 1000) % 60)
    };
};

const ImageCarousel = ({ images, mainImage, isEnded, hasAuction }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const displayImages = images?.length > 0 ? images : (mainImage ? [mainImage] : []);

    if (displayImages.length === 0) {
        return (
            <div className="search-card-image no-image-placeholder">
                <span className="no-image-text">No Image Available</span>
                <div className="search-badge-overlay">
                    {hasAuction && (
                        <span className={`search-badge ${isEnded ? 'ended' : 'live'}`}>
                            {isEnded ? 'Ended' : 'Live'}
                        </span>
                    )}
                </div>
            </div>
        );
    }

    const handlePrev = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setCurrentIndex(i => i === 0 ? displayImages.length - 1 : i - 1);
    };

    const handleNext = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setCurrentIndex(i => i === displayImages.length - 1 ? 0 : i + 1);
    };

    return (
        <div className="search-card-image">
            <img
                src={displayImages[currentIndex]}
                alt={`Property view ${currentIndex + 1}`}
                className="search-main-image"
            />

            <div className="search-badge-overlay">
                {hasAuction && (
                    <span className={`search-badge ${isEnded ? 'ended' : 'live'}`}>
                        {isEnded ? 'Ended' : 'Live'}
                    </span>
                )}
            </div>

            {displayImages.length > 1 && (
                <>
                    <button
                        onClick={handlePrev}
                        className="search-carousel-btn search-carousel-prev"
                        aria-label="Previous image"
                    >
                        ‹
                    </button>
                    <button
                        onClick={handleNext}
                        className="search-carousel-btn search-carousel-next"
                        aria-label="Next image"
                    >
                        ›
                    </button>

                    <div className="search-carousel-dots">
                        {displayImages.map((_, idx) => (
                            <div
                                key={idx}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setCurrentIndex(idx);
                                }}
                                className={`search-dot ${idx === currentIndex ? 'active' : ''}`}
                            />
                        ))}
                    </div>

                    <div className="search-image-counter">
                        {currentIndex + 1} / {displayImages.length}
                    </div>
                </>
            )}
        </div>
    );
};

const CountdownTimer = ({ timeLeft, hasAuction }) => {
    if (!hasAuction) {
        return (
            <div className="search-timer">
                <span className="search-timer-starting">Starting Soon</span>
            </div>
        );
    }

    if (timeLeft.total <= 0) {
        return (
            <div className="search-timer">
                <span className="search-timer-ended">Auction Ended</span>
            </div>
        );
    }

    return (
        <div className="search-timer">
            <div className="search-timer-units">
                <div className="search-timer-unit">
                    <span className="search-timer-num">{timeLeft.days}</span>
                    <span className="search-timer-label">d</span>
                </div>
                <span className="search-timer-colon">:</span>
                <div className="search-timer-unit">
                    <span className="search-timer-num">{timeLeft.hours}</span>
                    <span className="search-timer-label">h</span>
                </div>
                <span className="search-timer-colon">:</span>
                <div className="search-timer-unit">
                    <span className="search-timer-num">{timeLeft.minutes}</span>
                    <span className="search-timer-label">m</span>
                </div>
                <span className="search-timer-colon">:</span>
                <div className="search-timer-unit">
                    <span className="search-timer-num">{timeLeft.seconds}</span>
                    <span className="search-timer-label">s</span>
                </div>
            </div>
        </div>
    );
};

const PropertySearch = () => {
    const navigate = useNavigate();
    const [properties, setProperties] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [displayTerm, setDisplayTerm] = useState("");
    const debounceRef = useRef(null);
    const searchTermRef = useRef("");

    const fetchProperties = useCallback(async (term = "") => {
        try {
            const cleanTerm = term.trim().toLowerCase();
            const url = cleanTerm
                ? `http://localhost:8080/api/properties/search`
                : `http://localhost:8080/api/properties/active`;

            /**Axios takes the URL you chose in Step 3 and safely attaches the search term
             * to the end of it before firing it off to your Spring Boot server
             */

            const response = await axios.get(url, { params: { term: cleanTerm } });

            setProperties(response.data.map(property => ({
                ...property,
                timeLeft: calculateTimeLeft(property.auction?.endTime),
                isEnded: calculateTimeLeft(property.auction?.endTime).total <= 0
            })));
        } catch (error) {
            console.error("Fetch Error:", error);
        }
    }, []);

    useEffect(() => {
        fetchProperties("");
    }, [fetchProperties]);

    useEffect(() => {
        const timer = setInterval(() => {
            setProperties(prev => prev.map(p => ({
                ...p,
                timeLeft: calculateTimeLeft(p.auction?.endTime),
                isEnded: calculateTimeLeft(p.auction?.endTime).total <= 0
            })));
        }, 1000);
        return () => clearInterval(timer);
    }, []);


    //We use useRef to avoid stale closures
    //useEffect capture the values from the render when they were created.
    useEffect(() => {
        const sync = setInterval(() => {
            fetchProperties(searchTermRef.current);
        }, 5000);
        return () => clearInterval(sync);
    }, [fetchProperties]);

    const handleSearchChange = (e) => {
        //FOR THE UI
        const value = e.target.value;
        //USING USE STATE AS REACT DOES NOT REMEMBER VARIABLE VALUES UPON RE-RENDERING
        setDisplayTerm(value);

        //STOP OLD TIMER AND RUN NEW
        if (debounceRef.current) clearTimeout(debounceRef.current);

        debounceRef.current = setTimeout(() => {
            //for the backend/API search logic.
            const clean = value.trim().toLowerCase();


            //for UI update
            setSearchTerm(clean);
            //memory update, keep the useEffect functions updates with the latest value
            //useEffect will see nothing if the keystroke is not updated and the timer runs out
            searchTermRef.current = clean;
            fetchProperties(clean);
        }, 400);//WHEN USER PAUSES FOR 400MS THE SEARCH BEGINS
    };

    const handleClear = () => {
        setDisplayTerm("");
        setSearchTerm("");
        searchTermRef.current = "";
        if (debounceRef.current) clearTimeout(debounceRef.current);
        fetchProperties("");
    };

    return (
        <div className="search-page-wrapper">
            <Navbar />
            <div className="search-container">


                <header className="search-header">
                    <h1>Find Your Dream Property</h1>
                    <p>Browse live auctions and place your bid</p>
                    <div className="search-input-wrapper">
                        <input
                            type="text"
                            placeholder="Search by title or city..."
                            value={displayTerm}
                            onChange={handleSearchChange}
                            className="search-input"
                        />
                        {displayTerm && (
                            <button onClick={handleClear} className="search-clear-btn">
                                ✕
                            </button>
                        )}
                    </div>
                </header>

                <div className="search-results">
                    {properties.length === 0 ? (
                        <div className="search-empty">
                            <div className="empty-icon">🏠</div>
                            <h3>{searchTerm ? 'No properties found' : 'No active properties available'}</h3>
                            <p>
                                {searchTerm
                                    ? 'Try adjusting your search criteria'
                                    : 'Check back soon for new listings'}
                            </p>
                            {searchTerm && (
                                <button onClick={handleClear} className="empty-clear-btn">
                                    Clear Search
                                </button>
                            )}
                        </div>
                    ) : (
                        properties.map((property) => (
                            <div
                                key={property.id}
                                className="search-card"
                                onClick={() => navigate(`/property/${property.id}`)}
                            >
                                <ImageCarousel
                                    images={property.images}
                                    // If mainImage is an empty string, pass null instead
                                    mainImage={property.mainImage || null}
                                    isEnded={property.isEnded}
                                    hasAuction={!!property.auction}
                                />

                                <div className="search-card-content">
                                    <h3 className="search-card-title">{property.title}</h3>

                                    <p className="search-card-location">
                                        {property.city}, {property.postcode}
                                    </p>

                                    <div className="search-card-details">
                                        {property.bedrooms && (
                                            <span className="search-detail-item">
                                                {property.bedrooms} bed
                                            </span>
                                        )}
                                        {property.bathrooms && (
                                            <span className="search-detail-item">
                                                {property.bathrooms} bath
                                            </span>
                                        )}
                                        {property.receptions && (
                                            <span className="search-detail-item">
                                                {property.receptions} rec
                                            </span>
                                        )}
                                    </div>

                                    <div className="search-card-pricing">
                                        <div className="search-price-row">
                                            <span className="search-price-label">Current Bid</span>
                                            <span className="search-price-value">
                                                £{(property.auction?.currentPrice || property.reservePrice)?.toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="search-price-row secondary">
                                            <span className="search-price-label">Reserve</span>
                                            <span className="search-price-value">
                                                £{property.reservePrice?.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>

                                    <CountdownTimer
                                        timeLeft={property.timeLeft}
                                        hasAuction={!!property.auction}
                                    />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default PropertySearch;