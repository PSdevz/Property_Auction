import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import React from "react";
import './Auction.css';
import Navbar from "../Navbar/Navbar";
import Footer from "../Footer/Footer";
import { useNavigate, useParams } from "react-router-dom";

//Automatically dictates step based on current price
const getDynamicIncrement = (currentPrice) => {
    if (currentPrice < 50000) return 500;
    if (currentPrice < 100000) return 1000;
    if (currentPrice < 500000) return 2000;
    return 5000;
};

const PropertyDetail = () => {
    //Hook, Look at the address bar, find the part labeled 'id', and store it in this constant.
    const { id } = useParams();
    const navigate = useNavigate();
    const username = sessionStorage.getItem("username");

    const [bidAmount, setBidAmount] = useState("");
    const [property, setProperty] = useState(null);
    const [loading, setLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState(null);
    const [bidSuccess, setBidSuccess] = useState(false);
    const [isWatchlisted, setIsWatchlisted] = useState(false);
    const [watchlistLoading, setWatchlistLoading] = useState(false);
    const [hasUserBid, setHasUserBid] = useState(false);

    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);

    // Auto-bid states (No more custom increment state!)
    const [showAutoBid, setShowAutoBid] = useState(false);

    //USER ENTERS MAXIMUM BID, this stores the number typed:
    const [autoBidMax, setAutoBidMax] = useState("");
    const [activeAutoBid, setActiveAutoBid] = useState(null);

    const currentBid = property?.auction?.currentHighestBid || 0;
    const reservePrice = property?.reservePrice || 0;

    // System automatically calculates the required step
    const mandatoryIncrement = getDynamicIncrement(currentBid);
    const minRequired = currentBid > 0 ? currentBid + mandatoryIncrement : reservePrice;

    const isUserHighest = property?.auction?.highestBidder === username;

    const allImages = property?.images && property.images.length > 0
        ? property.images
        : (property?.mainImage ? [property.mainImage] : []);

    const nextImage = useCallback((e) => {
        if (e) e.stopPropagation();
        setCurrentImageIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
    }, [allImages.length]);

    const prevImage = useCallback((e) => {
        if (e) e.stopPropagation();
        setCurrentImageIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
    }, [allImages.length]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isLightboxOpen) return;
            if (e.key === "ArrowRight") nextImage();
            if (e.key === "ArrowLeft") prevImage();
            if (e.key === "Escape") setIsLightboxOpen(false);
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isLightboxOpen, nextImage, prevImage]);

    const fetchPropertyDetails = async (silent = false) => {
        if (!id) return;
        if (!silent) setLoading(true);
        try {
            const response = await axios.get(`http://localhost:8080/api/properties/${id}`);
            setProperty(response.data);
        } catch (err) {
            console.error("Error fetching property:", err);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const checkWatchlistStatus = async () => {
        if (!username || !id) return;
        try {
            const response = await axios.get(
                `http://localhost:8080/api/watchlist/${username}/check/${id}`
            );
            setIsWatchlisted(response.data);
        } catch (err) {
            console.error("Error checking watchlist:", err);
        }
    };

    const checkUserBidStatus = async () => {
        if (!username || !id) return;
        try {
            const response = await axios.get(
                `http://localhost:8080/api/auctions/users/${username}/bids`
            );
            const hasBid = response.data.some(p => p.id === parseInt(id));
            setHasUserBid(hasBid);
        } catch (err) {
            console.error("Error checking bid status:", err);
        }
    };

    const fetchAutoBidStatus = async () => {
        if (!username || !property?.auction?.auctionId) return;
        try {
            const response = await axios.get(
                `http://localhost:8080/api/autobid/${username}/${property.auction.auctionId}`
            );
            if (response.data && response.data.active === true) {
                setActiveAutoBid(response.data);
            } else {
                setActiveAutoBid(null);
            }
        } catch (err) {
            setActiveAutoBid(null);
        }
    };

    //PROXY BID SETTINGS
    const handleSetAutoBid = async () => {
        //converts the text the user typed into the input box (a String, like "1500.50") into an actual mathematical Number (like 1500.50) so the code can perform calculations with it
        const max = parseFloat(autoBidMax);
        const autoCalculatedIncrement = getDynamicIncrement(currentBid);
        const minAutoBid = currentBid > 0 ? currentBid + autoCalculatedIncrement : reservePrice;

        //check if it is a number and greater than zero
        if (isNaN(max) || max <= 0) {
            alert("Please enter a valid maximum amount.");
            return;
        }
        if (max < minAutoBid) {
            alert(`Maximum must be at least £${minAutoBid.toLocaleString()}.`);
            return;
        }

        try {
            // Passing the exact system-calculated step to the backend
            await axios.post('http://localhost:8080/api/autobid/set', {
                username,
                auctionId: property.auction.auctionId,
                maxAmount: max,
                incrementAmount: autoCalculatedIncrement
            });

            setActiveAutoBid({ maxAmount: max, incrementAmount: autoCalculatedIncrement, active: true });
            setShowAutoBid(false);
            setAutoBidMax("");
            alert("Auto-bid set successfully! The system will bid on your behalf.");
            fetchPropertyDetails();
        } catch (err) {
            alert(err.response?.data || "Failed to set auto-bid.");
        }
    };

    const handleCancelAutoBid = async () => {
        try {
            await axios.delete(
                `http://localhost:8080/api/autobid/${username}/${property.auction.auctionId}`
            );
            setActiveAutoBid(null);
            alert("Auto-bid cancelled.");
        } catch (err) {
            alert("Failed to cancel auto-bid.");
        }
    };

    /**user clicks on button which triggers handleWatchisToggle which
     *sees if value of setiswatchlisted is true or not by default it is false if it is true
     * then it sends a
     * delete request otherwise it sends a post request**/
    const handleWatchlistToggle = async (e) => {
        e.stopPropagation();
        if (!username) {
            alert("You must be logged in to use the watchlist.");
            navigate("/");
            return;
        }
        setWatchlistLoading(true);
        try {
            if (isWatchlisted) {
                await axios.delete(`http://localhost:8080/api/watchlist/${username}/remove/${id}`);
                setIsWatchlisted(false);
            } else {
                await axios.post(`http://localhost:8080/api/watchlist/${username}/add/${id}`);
                setIsWatchlisted(true);
            }
        } catch (err) {
            console.error("Watchlist error:", err);
            alert(err.response?.data || "Failed to update watchlist.");
        } finally {
            setWatchlistLoading(false);
        }
    };

    const handleBid = async (e) => {
        e.preventDefault();
        const amount = parseFloat(bidAmount);

        if (isNaN(amount) || amount <= 0) {
            alert("Please enter a valid bid amount.");
            return;
        }

        if (!username) {
            alert("You must be logged in to place a bid.");
            navigate("/");
            return;
        }

        try {
            const freshResponse = await axios.get(`http://localhost:8080/api/properties/${id}`);
            const freshProperty = freshResponse.data;
            const freshHighestBid = freshProperty.auction?.currentHighestBid || 0;
            const freshMinRequired = freshHighestBid > 0 ? freshHighestBid + getDynamicIncrement(freshHighestBid) : freshProperty.reservePrice;

            if (freshProperty.auction?.highestBidder === username) {
                alert("You are already the highest bidder.");
                setProperty(freshProperty);
                return;
            }

            if (amount < freshMinRequired) {
                alert(`Current highest bid is now £${freshHighestBid.toLocaleString()}. You must bid at least £${freshMinRequired.toLocaleString()}.`);
                setProperty(freshProperty);
                setBidAmount("");
                return;
            }

            const response = await axios.post(
                `http://localhost:8080/api/auctions/${freshProperty.auction.auctionId}/bid`,
                null,
                { params: { amount, bidderUsername: username } }
            );

            if (response.status === 200) {
                setBidSuccess(true);
                setHasUserBid(true);
                setBidAmount("");
                fetchPropertyDetails();
                fetchAutoBidStatus();
                setTimeout(() => setBidSuccess(false), 4000);
            }
        } catch (err) {
            const errorMessage = typeof err.response?.data === 'string'
                ? err.response.data
                : "An error occurred while placing your bid.";
            alert(errorMessage);
            fetchPropertyDetails();
        }
    };

    useEffect(() => {
        if (!property?.auction?.endTime) return;

        const interval = setInterval(() => {
            const end = new Date(property.auction.endTime).getTime();
            const now = Date.now();
            const diff = end - now;

            if (diff <= 0) {
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, ended: true });
                clearInterval(interval);
            } else {
                setTimeLeft({
                    days: Math.floor(diff / 86400000),
                    hours: Math.floor((diff % 86400000) / 3600000),
                    minutes: Math.floor((diff % 3600000) / 60000),
                    seconds: Math.floor((diff % 60000) / 1000),
                    ended: false
                });
            }
        }, 1000);

        return () => clearInterval(interval);
        // Watch the specific endTime string so the timer restarts when duration is updated
    }, [property?.auction?.endTime]);

    useEffect(() => {
        fetchPropertyDetails();
        checkWatchlistStatus();
        checkUserBidStatus();
        const refresh = setInterval(() => {
            fetchPropertyDetails(true);
            checkUserBidStatus();
        }, 3000);
        return () => clearInterval(refresh);
    }, [id]);

    useEffect(() => {
        if (property?.auction?.auctionId) {
            fetchAutoBidStatus();
        }
    }, [property?.auction?.auctionId, property?.auction?.currentHighestBid]);

    if (loading) {
        return (
            <div className="pd-page">
                <Navbar />
                <div className="pd-loading">
                    <div className="pd-spinner" />
                    <p>Loading property details...</p>
                </div>
                <Footer />
            </div>
        );
    }

    if (!property) {
        return (
            <div className="pd-page">
                <Navbar />
                <div className="pd-error">
                    <span className="pd-error-icon">🏚️</span>
                    <h2>Property Not Found</h2>
                    <p>This listing may have been removed or doesn't exist.</p>
                    <button onClick={() => navigate('/properties')} className="pd-back-btn">
                        Browse Properties
                    </button>
                </div>
                <Footer />
            </div>
        );
    }

    const isEnded =
        property.listingStatus === "SOLD" ||
        property.listingStatus === "DEACTIVATED" ||
        (property.listingStatus === "ENDED" && timeLeft?.ended) ||
        (property.auction?.endTime && new Date(property.auction.endTime) < new Date() && !timeLeft?.ended === false);

    return (
        <div className="pd-page">
            <Navbar />

            {isLightboxOpen && (
                <div style={lightboxOverlayStyle} onClick={() => setIsLightboxOpen(false)}>
                    <button style={closeButtonStyle} onClick={() => setIsLightboxOpen(false)}>✕</button>

                    {allImages.length > 1 && (
                        <>
                            <button style={arrowStyle('left', true)} onClick={prevImage}>‹</button>
                            <button style={arrowStyle('right', true)} onClick={nextImage}>›</button>
                        </>
                    )}

                    <div style={lightboxImageContainer} onClick={(e) => e.stopPropagation()}>
                        <img
                            src={allImages[currentImageIndex]}
                            alt="Zoomed Property"
                            style={lightboxImageStyle}
                        />
                        <div style={lightboxCounter}>
                            {currentImageIndex + 1} / {allImages.length}
                        </div>
                    </div>
                </div>
            )}



            {bidSuccess && (
                <div className="pd-success-banner">
                    <span>✓</span> Bid placed successfully — you are now the highest bidder.
                </div>
            )}

            <div className="pd-container">
                <div className="pd-left">

                    <div className="pd-image-section" onClick={() => setIsLightboxOpen(true)}
                         style={{cursor: 'zoom-in'}}>
                        <div className="pd-main-image" style={{
                            position: 'relative',
                            overflow: 'hidden',
                            backgroundColor: '#f0f0f5'
                        }}>
                            {allImages.length > 0 ? (
                                <img
                                    src={allImages[currentImageIndex]}
                                    alt={`${property.title} - View ${currentImageIndex + 1}`}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        transition: 'opacity 0.4s ease'
                                    }}
                                />
                            ) : (
                                <span style={{
                                    display: 'flex',
                                    height: '100%',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '3rem'
                                }}>🏠</span>
                            )}

                            {allImages.length > 1 && (
                                <>
                                    <button
                                        onClick={prevImage}
                                        style={arrowStyle('left')}
                                        className="pd-carousel-btn"
                                    >‹
                                    </button>
                                    <button
                                        onClick={nextImage}
                                        style={arrowStyle('right')}
                                        className="pd-carousel-btn"
                                    >›
                                    </button>

                                    <div style={dotContainerStyle}>
                                        {allImages.map((_, idx) => (
                                            <div
                                                key={idx}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setCurrentImageIndex(idx);
                                                }}
                                                style={dotStyle(idx === currentImageIndex)}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {property.listingStatus && (
                            <div className={`pd-listing-badge ${isEnded ? 'ended' : 'live'}`} style={{zIndex: 5}}>
                                {isEnded ? 'Auction Ended' : '● Live Auction'}
                            </div>
                        )}

                        {username && !isEnded && (
                            <button
                                onClick={handleWatchlistToggle}
                                disabled={watchlistLoading}
                                title={isWatchlisted ? 'Remove from watchlist' : 'Add to watchlist'}
                                style={heartButtonStyle(isWatchlisted)}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'scale(1.1)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'scale(1)';
                                }}
                            >
                                {watchlistLoading ? '...' : isWatchlisted ? '❤️' : '🤍'}
                            </button>
                        )}
                    </div>

                    <div className="pd-info-grid">
                        {property.bedrooms && (
                            <div className="pd-info-item">
                                <span className="pd-info-icon">🛏</span>
                                <div><strong>{property.bedrooms}</strong><span>Bedrooms</span></div>
                            </div>
                        )}
                        {property.bathrooms && (
                            <div className="pd-info-item">
                                <span className="pd-info-icon">🚿</span>
                                <div><strong>{property.bathrooms}</strong><span>Bathrooms</span></div>
                            </div>
                        )}
                        {property.receptions && (
                            <div className="pd-info-item">
                                <span className="pd-info-icon">🛋</span>
                                <div><strong>{property.receptions}</strong><span>Receptions</span></div>
                            </div>
                        )}
                    </div>

                    <div className="pd-description-card">
                        <h3>About This Property</h3>
                        <p>{property?.description || "No description provided."}</p>
                    </div>

                    <div className="pd-location-card">
                        <h3>Location</h3>
                        <div className="pd-address-row">
                            <span className="pd-pin">📍</span>
                            <p>{property?.address || "Address not available"}</p>
                        </div>
                    </div>

                    {/* --- Contact Seller Card (Now correctly nested inside pd-left) --- */}
                    <div className="pd-description-card" style={{marginTop: '24px', padding: '16px'}}>
                        <h3 style={{fontSize: '1.1rem', marginBottom: '12px'}}>Contact Seller</h3>
                        <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                            <div style={{
                                width: '40px', height: '40px', borderRadius: '50%',
                                background: '#f0f0f5', display: 'flex',
                                alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem'
                            }}>
                                👤
                            </div>
                            <div>
                                <p style={{margin: 0, fontSize: '0.85rem', color: '#6e6e80', fontWeight: 500}}>
                                    Listed by {property?.seller?.username || "Private Seller"}
                                </p>
                                <p style={{margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#1e1e2d'}}>
                                    <a href={`mailto:${property?.seller?.email}`}
                                       style={{color: 'inherit', textDecoration: 'none'}}>
                                        {property?.seller?.email || "Email hidden by seller"}
                                    </a>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>


                <div className="pd-right">
                    <div className="pd-bid-panel">

                        <div className="pd-panel-header">
                            <h1>{property?.title || "Untitled Property"}</h1>
                            <p className="pd-panel-address">{property?.address || "No address"}</p>
                        </div>

                        {timeLeft && !timeLeft.ended && !isEnded && (
                            <div className="pd-timer">
                                <span className="pd-timer-label">Auction Ends In</span>
                                <div className="pd-timer-units">
                                    {['days', 'hours', 'minutes', 'seconds'].map((unit, i) => (
                                        <React.Fragment key={unit}>
                                            {i > 0 && <span className="pd-timer-colon">:</span>}
                                            <div className="pd-timer-block">
                                                <span className="pd-timer-num">{timeLeft[unit]}</span>
                                                <span className="pd-timer-txt">
                            {['Days', 'Hrs', 'Min', 'Sec'][i]}
                        </span>
                                            </div>
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="pd-bid-display">
                            <div className="pd-bid-main">
                                <span className="pd-bid-label">{isEnded ? 'Final Price' : 'Current Bid'}</span>
                                <span className="pd-bid-amount">£{currentBid.toLocaleString()}</span>
                            </div>
                            <div className="pd-bid-meta" style={{ display: 'flex', justifyContent: 'center' }}>
                                <div className="pd-meta-item" style={{ alignItems: 'center' }}>
                                    <span className="pd-meta-label">Reserve</span>
                                    <span className="pd-meta-value">£{reservePrice.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        {username && !isEnded && currentBid > 0 && !isUserHighest && hasUserBid && (
                            <div className="pd-bid-status outbid" style={{ marginBottom: '16px' }}>
                                <span className="pd-status-dot" />
                                You have been outbid
                            </div>
                        )}

                        {activeAutoBid && !isEnded && (
                            <div style={{
                                padding: '12px 16px',
                                background: '#fffbeb',
                                border: '1px solid #fde68a',
                                borderRadius: 10,
                                marginBottom: 16,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}>
                                <div>
                                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#92400e', marginBottom: 2 }}>
                                        🤖 Auto-Bid Active
                                    </div>
                                    <div style={{ fontSize: '0.82rem', color: '#78716c' }}>
                                        Max: £{activeAutoBid.maxAmount?.toLocaleString()} •
                                        Step: £{activeAutoBid.incrementAmount?.toLocaleString()}
                                    </div>
                                </div>
                                <button
                                    onClick={handleCancelAutoBid}
                                    style={{
                                        background: 'transparent',
                                        border: '1px solid #fde68a',
                                        borderRadius: 6,
                                        padding: '6px 12px',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        color: '#92400e',
                                        cursor: 'pointer',
                                        fontFamily: 'inherit',
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        )}

                        {isEnded ? (
                            <div className="pd-ended-box">
                                {/* Check if it was an admin deactivation vs a natural end */}
                                <h3>{property.listingStatus === "DEACTIVATED" ? "Auction Deactivated" : "Auction Has Ended"}</h3>
                                <p>
                                    {property.listingStatus === "DEACTIVATED" ? (
                                        "This listing has been deactivated by the administrator. No further action is required."
                                    ) : isUserHighest ? (
                                        '🎉 Congratulations — you won this auction!'
                                    ) : (
                                        'This auction is no longer accepting bids.'
                                    )}
                                </p>
                            </div>
                        ) : property?.auction ? (

                            isUserHighest ? (
                                <div className="pd-bid-status winning" style={{ marginBottom: '16px' }}>
                                    <span className="pd-status-dot" />
                                    You are the highest bidder
                                </div>
                            ) : (
                                <>
                                    <form className="pd-bid-form" onSubmit={handleBid}>
                                        <label className="pd-form-label">
                                            Your Bid (minimum £{minRequired.toLocaleString()})
                                        </label>
                                        <div className="pd-input-wrapper">
                                            <span className="pd-currency">£</span>
                                            <input
                                                type="number"
                                                className="pd-bid-input"
                                                placeholder={minRequired.toLocaleString()}
                                                value={bidAmount}
                                                onChange={(e) => setBidAmount(e.target.value)}
                                                min={minRequired}
                                                required
                                            />
                                        </div>

                                        {/* Quick bids still allow users to manually jump the price as standard */}
                                        <div className="pd-quick-bids">
                                            {[1000, 5000, 10000].map(increment => (
                                                <button
                                                    key={increment}
                                                    type="button"
                                                    className="pd-quick-btn"
                                                    onClick={() => {
                                                        const current = parseFloat(bidAmount) || (currentBid > 0 ? currentBid : reservePrice);
                                                        setBidAmount((current + increment).toString());
                                                    }}
                                                >
                                                    +£{increment.toLocaleString()}
                                                </button>
                                            ))}
                                        </div>

                                        <button type="submit" className="pd-submit-bid">
                                            Place Bid
                                        </button>
                                    </form>

                                    {!activeAutoBid && (
                                        <div style={{ marginTop: 16 }}>
                                            {!showAutoBid ? (
                                                <button
                                                    onClick={() => setShowAutoBid(true)}
                                                    style={{
                                                        width: '100%',
                                                        padding: '12px',
                                                        background: '#f8f8f8',
                                                        border: '1px solid #ebebf0',
                                                        borderRadius: 10,
                                                        fontSize: '0.85rem',
                                                        fontWeight: 600,
                                                        color: '#1e1e2d',
                                                        cursor: 'pointer',
                                                        fontFamily: 'inherit',
                                                        transition: 'all 0.2s',
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.target.style.background = '#f0f0f5';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.target.style.background = '#f8f8f8';
                                                    }}
                                                >
                                                    🤖 Set Up Auto-Bid
                                                </button>
                                            ) : (
                                                <div style={{
                                                    background: '#f8f8f8',
                                                    border: '1px solid #ebebf0',
                                                    borderRadius: 12,
                                                    padding: '20px',
                                                }}>
                                                    <div style={{
                                                        fontSize: '0.9rem',
                                                        fontWeight: 700,
                                                        color: '#1e1e2d',
                                                        marginBottom: 4,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px'
                                                    }}>
                                                        🤖 Auto-Bid
                                                    </div>
                                                    <p style={{
                                                        fontSize: '0.82rem',
                                                        color: '#6e6e80',
                                                        marginBottom: 16,
                                                        lineHeight: 1.4,
                                                    }}>
                                                        Set your maximum price and the system will automatically
                                                        increase your bid when you're outbid.
                                                    </p>

                                                    <div style={{marginBottom: 12}}>
                                                        <div style={{ fontSize: '0.85rem', color: '#6e6e80', display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                                            <span>Minimum Next Bid: </span>
                                                            <span style={{ fontWeight: 700, color: '#1e1e2d' }}>
                                                                £{(currentBid > 0 ? currentBid + mandatoryIncrement : reservePrice).toLocaleString()}
                                                            </span>
                                                        </div>

                                                        <label style={{
                                                            fontSize: '0.85rem', fontWeight: 700,
                                                            color: '#1e1e2d', display: 'block', marginBottom: 6,
                                                        }}>
                                                            Set Maximum Auto-Bid (£)
                                                        </label>
                                                        <div style={{ position: 'relative' }}>
                                                            <span style={{
                                                                position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                                                                color: '#6e6e80', fontWeight: 600
                                                            }}>£</span>
                                                            <input
                                                                type="number"
                                                                value={autoBidMax}
                                                                onChange={(e) => setAutoBidMax(e.target.value)}
                                                                placeholder={`Min ${(currentBid > 0 ? currentBid + mandatoryIncrement : reservePrice).toLocaleString()}`}
                                                                style={{
                                                                    width: '100%',
                                                                    padding: '12px 12px 12px 28px',
                                                                    border: '1px solid #d1d1d6',
                                                                    borderRadius: 8,
                                                                    fontSize: '1rem',
                                                                    fontWeight: 600,
                                                                    color: '#1e1e2d',
                                                                    fontFamily: 'inherit',
                                                                    outline: 'none',
                                                                    boxSizing: 'border-box',
                                                                }}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                                                        <button
                                                            onClick={handleSetAutoBid}
                                                            style={{
                                                                flex: 1,
                                                                padding: '12px',
                                                                background: '#1e1e2d',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: 8,
                                                                fontSize: '0.95rem',
                                                                fontWeight: 700,
                                                                cursor: 'pointer',
                                                                fontFamily: 'inherit',
                                                                transition: 'background 0.2s'
                                                            }}
                                                        >
                                                            Activate Auto-Bid
                                                        </button>
                                                        <button
                                                            onClick={() => { setShowAutoBid(false); setAutoBidMax(""); }}
                                                            style={{
                                                                flex: 1,
                                                                padding: '12px',
                                                                background: '#fff',
                                                                color: '#1e1e2d',
                                                                border: '1px solid #d1d1d6',
                                                                borderRadius: 8,
                                                                fontSize: '0.95rem',
                                                                fontWeight: 700,
                                                                cursor: 'pointer',
                                                                fontFamily: 'inherit',
                                                                transition: 'background 0.2s'
                                                            }}
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>

                                                </div>
                                            )}
                                        </div>
                                    )}


                                </>
                            )
                        ) : (
                            <div className="pd-unavailable">
                                <span>⏳</span>
                                <p>Auction has not started yet.</p>
                            </div>
                        )}

                        <div className="pd-trust">
                            <div className="pd-trust-item"><span>🔒</span> Secure Bidding</div>
                            <div className="pd-trust-item"><span>✓</span> Verified Listing</div>
                            <div className="pd-trust-item"><span>⚡</span> Instant Updates</div>
                        </div>
                    </div>

                    <button onClick={() => navigate(-1)} className="pd-go-back">
                        ← Back to Listings
                    </button>
                </div>
            </div>
            <Footer />
        </div>
    );
};

// LIGHTBOX & CAROUSEL STYLES
const lightboxOverlayStyle = {
    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
    background: 'rgba(0, 0, 0, 0.95)', zIndex: 9999,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'zoom-out'
};

const lightboxImageContainer = {
    position: 'relative', width: '90%', height: '85%',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
};

const lightboxImageStyle = {
    maxWidth: '100%', maxHeight: '100%', objectFit: 'contain',
    borderRadius: '4px', boxShadow: '0 0 30px rgba(0,0,0,0.5)'
};

const closeButtonStyle = {
    position: 'absolute', top: '30px', right: '40px',
    background: 'none', border: 'none', color: 'white',
    fontSize: '40px', cursor: 'pointer', zIndex: 10001
};

const lightboxCounter = {
    position: 'absolute', bottom: '-40px', color: 'white',
    fontSize: '1rem', fontWeight: 600, letterSpacing: '1px'
};

const arrowStyle = (direction, isLightbox = false) => ({
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    [direction]: isLightbox ? '40px' : '20px',
    background: isLightbox ? 'rgba(255,255,255,0.1)' : 'rgba(255, 255, 255, 0.9)',
    border: 'none',
    width: isLightbox ? '60px' : '45px',
    height: isLightbox ? '60px' : '45px',
    borderRadius: '50%',
    fontSize: isLightbox ? '32px' : '24px',
    color: isLightbox ? 'white' : '#1e1e2d',
    cursor: 'pointer',
    zIndex: 10,
    boxShadow: isLightbox ? 'none' : '0 4px 12px rgba(0,0,0,0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    fontFamily: 'serif'
});

const dotContainerStyle = {
    position: 'absolute',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: '10px',
    zIndex: 10
};

const dotStyle = (isActive) => ({
    width: isActive ? '24px' : '8px',
    height: '8px',
    borderRadius: '8px',
    backgroundColor: isActive ? 'white' : 'rgba(255,255,255,0.5)',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
});

const heartButtonStyle = (isWatchlisted) => ({
    position: 'absolute',
    top: 16, right: 16,
    width: 44, height: 44,
    borderRadius: '50%', border: 'none',
    background: isWatchlisted ? 'rgba(254,242,242,0.95)' : 'rgba(255,255,255,0.9)',
    backdropFilter: 'blur(4px)',
    fontSize: '1.25rem',
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    zIndex: 6,
    transition: 'transform 0.2s, box-shadow 0.2s',
});

export default PropertyDetail;