import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Navbar from "../Navbar/Navbar";
import Footer from "../Footer/Footer";
import './Dashboard.css';
import { useNavigate } from 'react-router-dom';
import useSessionGuard from "../hooks/useSessionGuard";

const getErrorMessage = (err) => {
    const data = err?.response?.data;
    if (!data) return err?.message || "An unknown error occurred.";
    if (typeof data === 'string') return data;
    if (data.message) return data.message;
    if (data.error) return data.error;
    return "Something went wrong.";
};

// HELPER: Automatically attach credentials or tokens to requests
const getAxiosConfig = () => {
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    const config = { withCredentials: true }; // Helps if you use Session Cookies
    if (token) {
        config.headers = { Authorization: `Bearer ${token}` }; // Helps if you use JWT
    }
    return config;
};

const PaymentTimer = ({ property, auctionId, currentHighestBid, navigate }) => {
    const [timeLeft, setTimeLeft] = useState("");
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        const calculateTime = () => {
            if (!property.auction) return; // Safety check

            let deadline;
            if (property.auction.paymentDeadline) {
                deadline = new Date(property.auction.paymentDeadline).getTime();
            } else {
                const end = new Date(property.auction.endTime).getTime();
                deadline = end + (60 * 1000);
            }

            const now = new Date().getTime();
            const diff = deadline - now;

            if (isNaN(diff) || diff <= 0) {
                setTimeLeft("EXPIRED");
                setIsExpired(true);
                return;
            }

            setIsExpired(false);
            const h = Math.floor(diff / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeLeft(`${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`);
        };

        calculateTime();
        const interval = setInterval(calculateTime, 1000);
        return () => clearInterval(interval);
    }, [property]);

    return (
        <>
            <div style={{
                fontSize: '1.1rem',
                fontWeight: 800,
                color: '#e11d48',
                margin: '8px 0',
                fontFamily: 'monospace'
            }}>
                {isExpired ? "🚫 EXPIRED" : `⏱ ${timeLeft}`}
            </div>

            <p style={{
                fontSize: '0.78rem',
                marginBottom: '10px',
                color: isExpired ? '#9f1239' : '#b45309',
                fontWeight: isExpired ? 600 : 400
            }}>
                {isExpired
                    ? "The payment window has closed. This property will be offered to the underbidder."
                    : "Secure this property within 24 hrs or it goes to the next bidder."}
            </p>

            {!isExpired && (
                <button
                    onClick={() => navigate(`/payment/${auctionId}`)}
                    style={{
                        width: '100%',
                        padding: '12px',
                        background: '#1e1e2d',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.92rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                        e.target.style.background = '#2d2d3f';
                        e.target.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.background = '#1e1e2d';
                        e.target.style.transform = 'translateY(0)';
                    }}
                >
                    💳 Pay Deposit (10%) — £{(currentHighestBid * 0.1).toLocaleString()}
                </button>
            )}
        </>
    );
};

const ImageCarousel = ({ images, mainImage }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    // FIX: Filter out empty strings ("") sent from the backend to prevent the React src warning
    const validImages = (images || []).filter(img => img && typeof img === 'string' && img.trim() !== "");
    const validMainImage = mainImage && typeof mainImage === 'string' && mainImage.trim() !== "" ? mainImage : null;
    const displayImages = validImages.length > 0 ? validImages : (validMainImage ? [validMainImage] : []);

    if (displayImages.length === 0) {
        return (
            <div style={{
                width: '100%',
                height: '180px',
                backgroundColor: '#f0f0f5',
                borderRadius: '12px',
                margin: '0 0 16px 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <span style={{ fontSize: '3rem' }}>🏠</span>
            </div>
        );
    }

    const handlePrev = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setCurrentIndex((prev) => (prev === 0 ? displayImages.length - 1 : prev - 1));
    };

    const handleNext = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setCurrentIndex((prev) => (prev === displayImages.length - 1 ? 0 : prev + 1));
    };

    return (
        <div style={{
            width: '100%',
            height: '180px',
            backgroundColor: '#1e1e2d',
            borderRadius: '12px',
            margin: '0 0 16px 0',
            position: 'relative',
            overflow: 'hidden'
        }}>
            <img
                src={displayImages[currentIndex]}
                alt={`View ${currentIndex + 1}`}
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    transition: 'opacity 0.3s ease-in-out'
                }}
            />

            {displayImages.length > 1 && (
                <>
                    <button onClick={handlePrev} style={{ ...carouselBtnStyle, left: '8px' }}>‹</button>
                    <button onClick={handleNext} style={{ ...carouselBtnStyle, right: '8px' }}>›</button>

                    <div style={{
                        position: 'absolute',
                        bottom: '10px',
                        left: 0,
                        right: 0,
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '6px',
                        zIndex: 10
                    }}>
                        {displayImages.map((_, idx) => (
                            <div key={idx} style={{
                                width: '6px', height: '6px', borderRadius: '50%',
                                backgroundColor: idx === currentIndex ? 'white' : 'rgba(255,255,255,0.4)',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                            }} />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

const carouselBtnStyle = {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'rgba(0,0,0,0.4)',
    color: 'white',
    border: 'none',
    borderRadius: '50%',
    width: '26px',
    height: '26px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 10,
    fontSize: '16px',
    paddingBottom: '2px',
    transition: 'background 0.2s',
    fontFamily: 'serif'
};

const BuyerDashboard = () => {
    useSessionGuard();

    const [activeTab, setActiveTab] = useState("ACTIVE");
    const [myBids, setMyBids] = useState([]);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState(false); // FIX: Stop infinite polling on 403 errors
    const navigate = useNavigate();
    const username = sessionStorage.getItem("username");
    const [bidAmounts, setBidAmounts] = useState({});
    const [watchlist, setWatchlist] = useState([]);
    const [paymentStatuses, setPaymentStatuses] = useState({});

    const isAuctionEnded = (property) => {
        const endTime = property.auction?.endTime;
        const timePassed = endTime ? new Date(endTime) < new Date() : false;

        return property.listingStatus === "ENDED" ||
            property.listingStatus === "SOLD" ||
            property.listingStatus === "DEACTIVATED" ||
            property.auction?.status === "ENDED" ||
            property.auction?.status === "SOLD" ||
            property.auction?.status === "CANCELLED" ||
            timePassed;
    };

    const isTimerExpired = (property) => {
        let deadline;
        if (property.auction?.paymentDeadline) {
            deadline = new Date(property.auction.paymentDeadline).getTime();
        } else {
            const end = new Date(property.auction?.endTime).getTime();
            deadline = end + (60 * 1000);
        }
        return new Date().getTime() > deadline;
    };

    const activeBids = myBids
        .filter(p => !isAuctionEnded(p))
        .sort((a, b) => {
            const aWinning = a.auction?.highestBidder === username ? 0 : 1;
            const bWinning = b.auction?.highestBidder === username ? 0 : 1;
            if (aWinning !== bWinning) return aWinning - bWinning;
            return a.id - b.id;
        });

    const endedBids = myBids
        .filter(p => isAuctionEnded(p))
        .sort((a, b) => {
            const aWon = a.auction?.highestBidder === username ? 0 : 1;
            const bWon = b.auction?.highestBidder === username ? 0 : 1;
            if (aWon !== bWon) return aWon - bWon;
            return a.id - b.id;
        });

    //FILTER WATCHLIST PROPERTIES, REMOVE SOLD ONES
    const activeWatchlist = watchlist.filter(p => !isAuctionEnded(p));
    const activeBidsCount = activeBids.length;

    const historyWonOverallCount = endedBids.filter(p => {
        const isWinner = p.auction?.highestBidder === username;
        const auctionId = p.auction?.auctionId || p.auction?.id;
        const isExpiredForfeit = isWinner && paymentStatuses[auctionId] !== 'COMPLETED' && isTimerExpired(p);
        return isWinner && !isExpiredForfeit;
    }).length;

    const historyLostCount = endedBids.filter(p => p.auction?.highestBidder !== username).length;

    const historyPaidCount = endedBids.filter(p => {
        const isWinner = p.auction?.highestBidder === username;
        const auctionId = p.auction?.auctionId || p.auction?.id;
        return isWinner && paymentStatuses[auctionId] === 'COMPLETED';
    }).length;

    const historyExpiredCount = endedBids.filter(p => {
        const isWinner = p.auction?.highestBidder === username;
        const auctionId = p.auction?.auctionId || p.auction?.id;
        return isWinner && paymentStatuses[auctionId] !== 'COMPLETED' && isTimerExpired(p);
    }).length;

    const getFilteredHistory = () => {
        return endedBids.filter(property => {
            const isWinner = property.auction?.highestBidder === username;
            const auctionId = property.auction?.auctionId || property.auction?.id;
            const paymentStatus = paymentStatuses[auctionId];
            const expired = isTimerExpired(property);

            const isExpiredForfeit = isWinner && paymentStatus !== 'COMPLETED' && expired;

            if (activeTab === "HISTORY_ALL" || activeTab === "HISTORY") return true;
            if (activeTab === "HISTORY_WON") return isWinner && !isExpiredForfeit;
            if (activeTab === "HISTORY_LOST") return !isWinner;
            if (activeTab === "HISTORY_PAID") return isWinner && paymentStatus === 'COMPLETED';
            if (activeTab === "HISTORY_EXPIRED") return isExpiredForfeit;
            return true;
        });
    };

    const fetchMyBids = useCallback(async (silent = false) => {
        if (authError) return; // Stop fetching if backend rejected us
        try {
            if (!silent) setLoading(true);
            const response = await axios.get(
                `http://localhost:8080/api/auctions/users/${username}/bids`,
                getAxiosConfig()
            );
            const newData = response.data;

            setMyBids(prev => {
                const prevStr = JSON.stringify(prev.map(p => ({
                    id: p.id, bid: p.auction?.currentHighestBid, bidder: p.auction?.highestBidder,
                    status: p.listingStatus, endTime: p.auction?.endTime
                })));
                const newStr = JSON.stringify(newData.map(p => ({
                    id: p.id, bid: p.auction?.currentHighestBid, bidder: p.auction?.highestBidder,
                    status: p.listingStatus, endTime: p.auction?.endTime
                })));
                return prevStr === newStr ? prev : newData;
            });
        } catch (error) {
            console.error("Error fetching bids:", error);
            if (error.response && (error.response.status === 403 || error.response.status === 401)) {
                setAuthError(true);
            }
        } finally {
            if (!silent) setLoading(false);
        }
    }, [username, authError]);

    const fetchWatchlist = useCallback(async () => {
        if (authError) return;
        try {
            const response = await axios.get(`http://localhost:8080/api/watchlist/${username}`, getAxiosConfig());
            setWatchlist(prev => {
                const prevIds = prev.map(p => p.id).join(',');
                const newIds = response.data.map(p => p.id).join(',');
                return prevIds === newIds ? prev : response.data;
            });
        } catch (err) {
            console.error("Watchlist fetch error:", err);
            if (err.response && (err.response.status === 403 || err.response.status === 401)) {
                setAuthError(true);
            }
        }
    }, [username, authError]);

    const fetchPaymentStatuses = useCallback(async () => {
        if (authError) return;
        const wonBids = myBids.filter(p => isAuctionEnded(p) && p.auction?.highestBidder === username);
        const statuses = {};

        for (const property of wonBids) {
            const auctionId = property.auction?.auctionId || property.auction?.id;
            if (!auctionId) continue;

            try {
                const config = getAxiosConfig();
                config.params = { auctionId, username };
                const res = await axios.get('http://localhost:8080/api/payments/status', config);
                statuses[auctionId] = res.data?.status || 'NOT_STARTED';
            } catch (err) {
                statuses[auctionId] = 'NOT_STARTED';
                if (err.response && (err.response.status === 403 || err.response.status === 401)) {
                    setAuthError(true);
                }
            }
        }

        setPaymentStatuses(prev => {
            const prevStr = JSON.stringify(prev);
            const newStr = JSON.stringify(statuses);
            return prevStr === newStr ? prev : statuses;
        });
    }, [myBids, username, authError]);

    const handleBid = async (auctionId, amount) => {
        try {
            const freshResponse = await axios.get(
                `http://localhost:8080/api/auctions/users/${username}/bids`,
                getAxiosConfig()
            );
            const freshProperty = freshResponse.data.find(p =>
                p.auction?.auctionId === auctionId || p.auction?.id === auctionId
            );
            const freshHighestBid = freshProperty?.auction?.currentHighestBid ?? 0;

            if (freshProperty?.auction?.highestBidder === username) {
                alert("You are already the highest bidder.");
                setMyBids(freshResponse.data);
                return;
            }

            if (amount <= freshHighestBid) {
                alert(`Current highest bid is now £${freshHighestBid.toLocaleString()}. You must bid higher.`);
                setMyBids(freshResponse.data);
                return;
            }

            const postConfig = getAxiosConfig();
            postConfig.params = { amount, bidderUsername: username };

            await axios.post(`http://localhost:8080/api/auctions/${auctionId}/bid`, null, postConfig);

            fetchMyBids();
            setBidAmounts(prev => ({ ...prev, [auctionId]: amount + 1000 }));

        } catch (err) {
            alert(getErrorMessage(err));
            fetchMyBids();
        }
    };

    useEffect(() => {
        if (!username) {
            navigate("/");
            return;
        }
        if (authError) {
            console.error("403 Forbidden: Stopping dashboard polling to prevent infinite loop.");
            return;
        }

        fetchMyBids();
        fetchWatchlist();
        const interval = setInterval(() => {
            fetchMyBids(true);
            fetchWatchlist();
        }, 10000);
        return () => clearInterval(interval);
    }, [username, fetchMyBids, fetchWatchlist, authError, navigate]);

    useEffect(() => {
        if (myBids.length > 0) {
            fetchPaymentStatuses();
        }
    }, [myBids, fetchPaymentStatuses]);

    const renderCard = (property) => {
        const currentHighestBid = property.auction?.currentHighestBid ?? 0;
        const isWinner = property.auction?.highestBidder === username;
        const isEnded = isAuctionEnded(property);
        const auctionId = property.auction?.auctionId || property.auction?.id;
        const defaultBidAmount = bidAmounts[property.id] ?? (currentHighestBid + 1000);
        const paymentStatus = paymentStatuses[auctionId];

        return (
            <div
                key={property.id}
                className={`property-card ${isWinner ? 'winning-card' : 'outbid-card'}`}
                style={{ transition: 'opacity 0.3s ease' }}
            >
            <span className={`status-badge ${
                isEnded
                    ? (isWinner
                        ? (paymentStatus === 'COMPLETED' ? 'won' : 'won')
                        : 'ended')
                    : (isWinner ? 'winning' : 'outbid')
            }`}>
                {isEnded
                    ? (isWinner
                        ? (paymentStatus === 'COMPLETED' ? "PAID" : "WON")
                        : "LOST")
                    : (isWinner ? "WINNING" : "OUTBID")
                }
            </span>

                <ImageCarousel images={property.images} mainImage={property.mainImage} />

                <h3>{property.title ?? "Untitled Property"}</h3>
                <p style={{ color: '#8e8ea0', fontSize: '0.88rem' }}>
                    📍 {property.address || "No address"}
                </p>
                <p style={{ fontWeight: 700, marginTop: '8px' }}>
                    {isEnded ? "Final Price" : "Current Bid"}: £{currentHighestBid.toLocaleString()}
                </p>

                {isEnded && property.auction?.endTime && (
                    <p style={{ fontSize: '0.82rem', color: '#8e8ea0', marginTop: '4px' }}>
                        Ended: {new Date(property.auction.endTime).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                    })}
                    </p>
                )}

                {!isEnded ? (
                    isWinner ? (
                        <div style={{
                            padding: '15px',
                            background: '#ecfdf5',
                            color: '#065f46',
                            borderRadius: '8px',
                            fontWeight: 600,
                            textAlign: 'center',
                            marginTop: '10px',
                            border: '1px solid #a7f3d0',
                            fontSize: '0.92rem',
                        }}>
                            ✓ You are the highest bidder
                        </div>
                    ) : (
                        <>
                            <input
                                type="number"
                                value={defaultBidAmount}
                                onChange={(e) => setBidAmounts(prev => ({
                                    ...prev,
                                    [property.id]: Number(e.target.value)
                                }))}
                                style={{
                                    padding: '10px',
                                    margin: '10px 0',
                                    borderRadius: '8px',
                                    border: '2px solid #e0e0e8',
                                    width: '100%',
                                    fontSize: '0.92rem',
                                    fontWeight: 600,
                                    fontFamily: 'inherit',
                                    boxSizing: 'border-box',
                                }}
                            />
                            <button
                                className="bid-btn"
                                onClick={() => handleBid(auctionId, defaultBidAmount)}
                            >
                                Place Bid
                            </button>
                        </>
                    )
                ) : (
                    isWinner ? (
                        paymentStatus === 'COMPLETED' ? (
                            <div style={{
                                padding: '20px',
                                background: '#ecfdf5',
                                color: '#065f46',
                                borderRadius: '10px',
                                textAlign: 'center',
                                marginTop: '10px',
                                border: '1px solid #a7f3d0',
                            }}>
                                <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>✅</div>
                                <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '4px' }}>
                                    Deposit Paid
                                </div>
                                <div style={{ fontSize: '0.82rem', color: '#047857' }}>
                                    £{(currentHighestBid * 0.1).toLocaleString()} deposit received
                                </div>
                                <div style={{
                                    marginTop: '10px',
                                    padding: '8px 12px',
                                    background: '#d1fae5',
                                    borderRadius: '6px',
                                    fontSize: '0.78rem',
                                    color: '#065f46',
                                    fontWeight: 600,
                                }}>
                                    Our team will contact you within 24 hours
                                </div>
                            </div>
                        ) : (
                            <div style={{
                                padding: '15px',
                                background: '#fffbeb',
                                color: '#92400e',
                                borderRadius: '8px',
                                textAlign: 'center',
                                marginTop: '10px',
                                border: '1px solid #fde68a',
                            }}>
                                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                                    🎉 Auction Won!
                                </div>

                                <PaymentTimer
                                    property={property}
                                    auctionId={auctionId}
                                    currentHighestBid={currentHighestBid}
                                    navigate={navigate}
                                />
                            </div>
                        )
                    ) : (
                        <div style={{
                            padding: '15px',
                            background: '#f7f7f9',
                            color: '#6e6e80',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            textAlign: 'center',
                            marginTop: '10px',
                            border: '1px solid #ebebf0',
                        }}>
                            Auction Closed
                        </div>
                    )
                )}

                <button
                    onClick={() => navigate(`/property/${property.id}`)}
                    style={{
                        marginTop: '10px',
                        background: '#f0f0f5',
                        color: '#1e1e2d',
                        padding: '10px',
                        borderRadius: '6px',
                        border: '1px solid #ebebf0',
                        cursor: 'pointer',
                        width: '100%',
                        fontWeight: 600,
                        fontFamily: 'inherit',
                    }}
                >
                    View Details
                </button>
            </div>
        );
    };

    return (
        <div className="dashboard-page-wrapper">
            <Navbar />
            <div className="container-main">
                <header className="buyer-header">
                    <h1>Buyer Dashboard</h1>
                    <p>Manage your bids, watchlist, and auction history.</p>
                </header>

                {authError && (
                    <div style={{ padding: '15px', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '20px', border: '1px solid #f87171' }}>
                        <strong>⚠️ Session Error:</strong> We couldn't verify your session. Please refresh the page or log in again to view your active bids.
                    </div>
                )}

                <div className="stats-row">
                    <div className="stat-card">
                        <h3>{activeBidsCount}</h3>
                        <p>Active Bids</p>
                    </div>
                    <div className="stat-card">
                        <h3>{activeWatchlist.length}</h3>
                        <p>Watchlist</p>
                    </div>
                    <div className="stat-card">
                        <h3>{historyWonOverallCount}</h3>
                        <p>Won</p>
                    </div>
                    <div className="stat-card">
                        <h3>{historyLostCount}</h3>
                        <p>Lost</p>
                    </div>
                </div>

                <div className="dashboard-tabs">
                    <button
                        className={activeTab === "ACTIVE" ? "tab active" : "tab"}
                        onClick={() => setActiveTab("ACTIVE")}
                    >
                        Active ({activeBidsCount})
                    </button>
                    <button
                        className={activeTab === "WATCHLIST" ? "tab active" : "tab"}
                        onClick={() => setActiveTab("WATCHLIST")}
                    >
                        Watchlist ({activeWatchlist.length})
                    </button>
                    <button
                        className={activeTab.startsWith("HISTORY") ? "tab active" : "tab"}
                        onClick={() => setActiveTab("HISTORY_ALL")}
                    >
                        History ({endedBids.length})
                    </button>
                </div>

                {activeTab === "ACTIVE" && (
                    <div className="property-grid">
                        {loading && myBids.length === 0 ? (
                            <div className="loading">Loading your bids...</div>
                        ) : activeBids.length > 0 ? (
                            activeBids.map(renderCard)
                        ) : (
                            <div className="no-results-container">
                                <p>No active bids right now.</p>
                                <button onClick={() => navigate('/properties')}>
                                    Browse Auctions
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "WATCHLIST" && (
                    <div className="property-grid">
                        {activeWatchlist.length > 0 ? (
                            activeWatchlist.map(property => (
                                <div key={property.id} className="property-card">
                                    <span className="status-badge winning">WATCHING</span>

                                    <ImageCarousel images={property.images} mainImage={property.mainImage} />

                                    <h3>{property.title}</h3>
                                    <p style={{ color: '#8e8ea0', fontSize: '0.88rem' }}>
                                        📍 {property.address}
                                    </p>
                                    <p style={{ fontWeight: 700, marginTop: '8px' }}>
                                        Current Bid: £{property.auction?.currentHighestBid?.toLocaleString() || "0"}
                                    </p>
                                    <button
                                        onClick={() => navigate(`/property/${property.id}`)}
                                        style={{
                                            marginTop: '10px',
                                            background: '#1e1e2d',
                                            color: 'white',
                                            padding: '10px',
                                            borderRadius: '6px',
                                            border: 'none',
                                            cursor: 'pointer',
                                            width: '100%',
                                            fontWeight: 600,
                                            fontFamily: 'inherit',
                                        }}
                                    >
                                        View Auction
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="no-results-container">
                                <p>Your watchlist is empty.</p>
                                <button onClick={() => navigate('/properties')}>
                                    Browse Auctions
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {activeTab.startsWith("HISTORY") && (
                    <>
                        <div style={{ marginBottom: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            <button
                                onClick={() => setActiveTab("HISTORY_ALL")}
                                style={{
                                    padding: '10px 16px', borderRadius: 8, border: 'none',
                                    background: activeTab === "HISTORY_ALL" || activeTab === "HISTORY" ? '#1e1e2d' : '#f0f0f5',
                                    color: activeTab === "HISTORY_ALL" || activeTab === "HISTORY" ? 'white' : '#555',
                                    cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s'
                                }}
                            >
                                All ({endedBids.length})
                            </button>
                            <button
                                onClick={() => setActiveTab("HISTORY_WON")}
                                style={{
                                    padding: '10px 16px', borderRadius: 8, border: 'none',
                                    background: activeTab === "HISTORY_WON" ? '#059669' : '#f0f0f5',
                                    color: activeTab === "HISTORY_WON" ? 'white' : '#555',
                                    cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s'
                                }}
                            >
                                Won ({historyWonOverallCount})
                            </button>
                            <button
                                onClick={() => setActiveTab("HISTORY_LOST")}
                                style={{
                                    padding: '10px 16px', borderRadius: 8, border: 'none',
                                    background: activeTab === "HISTORY_LOST" ? '#dc2626' : '#f0f0f5',
                                    color: activeTab === "HISTORY_LOST" ? 'white' : '#555',
                                    cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s'
                                }}
                            >
                                Lost ({historyLostCount})
                            </button>
                            <button
                                onClick={() => setActiveTab("HISTORY_PAID")}
                                style={{
                                    padding: '10px 16px', borderRadius: 8, border: 'none',
                                    background: activeTab === "HISTORY_PAID" ? '#0891b2' : '#f0f0f5',
                                    color: activeTab === "HISTORY_PAID" ? 'white' : '#555',
                                    cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s'
                                }}
                            >
                                Paid ({historyPaidCount})
                            </button>
                            <button
                                onClick={() => setActiveTab("HISTORY_EXPIRED")}
                                style={{
                                    padding: '10px 16px', borderRadius: 8, border: 'none',
                                    background: activeTab === "HISTORY_EXPIRED" ? '#f59e0b' : '#f0f0f5',
                                    color: activeTab === "HISTORY_EXPIRED" ? 'white' : '#555',
                                    cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s'
                                }}
                            >
                                Expired ({historyExpiredCount})
                            </button>
                        </div>

                        <div className="property-grid">
                            {getFilteredHistory().length > 0 ? (
                                getFilteredHistory().map(renderCard)
                            ) : (
                                <div className="no-results-container">
                                    <p>No completed auctions match this filter.</p>
                                    <button onClick={() => navigate('/properties')}>
                                        Browse Auctions
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
            <Footer />
        </div>
    );
};

export default BuyerDashboard;