import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../Navbar/Navbar";
import Footer from "../Footer/Footer";
import "./LandingPage.css";

const LandingPage = () => {
    const navigate = useNavigate();
    const [howTab, setHowTab] = useState("buyer");
    const [featured, setFeatured] = useState([]);
    const [loading, setLoading] = useState(true);

    const [globalStats, setGlobalStats] = useState({
        activeAuctions: 0,
        propertiesSold: 0,
        totalUsers: 0,
        totalBids: 0
    });

    useEffect(() => {
        const loadPageData = async () => {
            try {
                //main image retrieved from properties table in the databse
                const propertyRes = await axios.get("http://localhost:8080/api/properties/active");
                const data = Array.isArray(propertyRes.data) ? propertyRes.data : [];
                const now = new Date();

                const strictlyActive = data.filter(p => {
                    if (p.listingStatus && p.listingStatus !== "ACTIVE") return false;
                    if (p.auction?.endTime && new Date(p.auction.endTime) <= now) return false;
                    return true;
                });

                const activeOnly = strictlyActive.filter(p => {
                    const timeLeft = formatTimeLeft(p.auction?.endTime);
                    return timeLeft !== "Ended";
                });

                const recentSix = [...activeOnly].reverse().slice(0, 6);
                setFeatured(recentSix);

                const statsRes = await axios.get("http://localhost:8080/api/properties/stats/global");
                setGlobalStats(statsRes.data);

            } catch (err) {
                console.error("Error loading landing page data:", err);
            } finally {
                setLoading(false);
            }
        };

        loadPageData();
        const intervalId = setInterval(loadPageData, 30000);
        return () => clearInterval(intervalId);
    }, []);

    const handlePropertyClick = (id) => {
        const user = sessionStorage.getItem("username");
        const userRole = sessionStorage.getItem("role");
        if (!user) return navigate("/login");

        if (userRole === "BUYER") return navigate(`/property/${id}`);
        return navigate(userRole === "ADMIN" ? "/admin-dashboard" : "/seller-dashboard");
    };

    const formatTimeLeft = (endTime) => {
        if (!endTime) return "Starting Soon";
        const diff = new Date(endTime) - new Date();
        if (diff <= 0) return "Ended";

        const days = Math.floor(diff / 86400000);
        const hours = Math.floor((diff % 86400000) / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);

        if (days > 0) return `${days}d ${hours}h left`;
        return `${hours}h ${mins}m left`;
    };

    const handleImageError = (e) => {
        e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f0f0f0" width="400" height="300"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
    };

    return (
        <div className="lp">
            <Navbar />

            <section className="lp-hero">
                <div className="lp-hero-inner">
                    <div className="lp-hero-text">
                        <h1>
                            Buy & Sell Properties at
                            <span className="lp-highlight"> AuctionPro </span>
                        </h1>
                        <p>
                            Transparent bidding. Real-time countdowns. No hidden fees.
                            Join thousands finding their next property.
                        </p>

                        <div className="lp-hero-btns" style={{ marginTop: 10 }}>
                            <button className="lp-btn lp-btn-dark" onClick={() => navigate("/login", { state: { action: "Login" } })}>Login</button>
                            <button className="lp-btn lp-btn-light" onClick={() => navigate("/login", { state: { action: "Sign Up" } })}>Sign Up</button>
                        </div>

                        <div className="lp-trust">
                            <span>Free to join</span>
                            <span>Secure bidding</span>
                        </div>
                    </div>

                    <div
                        className="lp-hero-card"
                        onClick={() => featured[0] && handlePropertyClick(featured[0].id)}
                        style={{ cursor: featured.length > 0 ? 'pointer' : 'default' }}
                    >
                        <div className="lp-card-img">
                            {featured.length > 0 ? (
                                <>
                                    <img
                                        src={featured[0].mainImage}
                                        alt={featured[0].title}
                                        onError={handleImageError}
                                    />
                                    <span className="lp-card-live-dot">LIVE</span>
                                </>
                            ) : (
                                <div className="lp-no-auctions">No live auctions</div>
                            )}
                        </div>
                        <div className="lp-card-body">
                            {featured.length > 0 ? (
                                <>
                                    <span className="lp-card-live">LIVE NOW</span>
                                    <strong>
                                        £{(featured[0].auction?.currentPrice || featured[0].auction?.currentHighestBid || featured[0].reservePrice)?.toLocaleString()}
                                    </strong>
                                    <small>Ends in: {formatTimeLeft(featured[0].auction?.endTime)}</small>
                                </>
                            ) : (
                                <strong>Auctions starting soon</strong>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <section className="lp-stats">
                <div className="lp-stats-row">
                    <div className="lp-stat-box">
                        <h3>{globalStats.activeAuctions}</h3>
                        <p>Live Auctions</p>
                    </div>
                    <div className="lp-stat-divider" />
                    <div className="lp-stat-box">
                        <h3>{globalStats.propertiesSold}+</h3>
                        <p>Properties Sold</p>
                    </div>
                    <div className="lp-stat-divider" />
                    <div className="lp-stat-box">
                        <h3>{globalStats.totalBids.toLocaleString()}+</h3>
                        <p>Bids Placed</p>
                    </div>
                    <div className="lp-stat-divider" />
                    <div className="lp-stat-box">
                        <h3>
                            {globalStats.totalUsers >= 1000
                                ? `${(globalStats.totalUsers / 1000).toFixed(1)}k+`
                                : globalStats.totalUsers}
                        </h3>
                        <p>Trusted Users</p>
                    </div>
                </div>
            </section>

            <section className="lp-featured">
                <div className="lp-section-title">
                    <h2>Live Right Now</h2>
                    <p>Newest properties with active bidding</p>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#8e8ea0' }}>
                        Loading auctions...
                    </div>
                ) : (
                    <div className="lp-featured-grid">
                        {featured.length > 0 ? (
                            featured.map((p) => (
                                <div
                                    key={p.id}
                                    className="lp-property"
                                    onClick={() => handlePropertyClick(p.id)}
                                >
                                    <div className="lp-property-img">
                                        <img
                                            src={p.mainImage}
                                            alt={p.title}
                                            onError={handleImageError}
                                        />
                                        <span className="lp-property-badge">LIVE</span>
                                    </div>
                                    <div className="lp-property-info">
                                        <h3>{p.title}</h3>
                                        <p className="lp-property-addr">📍 {p.city}, {p.postcode}</p>
                                        <div className="lp-property-meta">
                                            <span>{p.bedrooms} bed</span>
                                            <span>•</span>
                                            <span>{formatTimeLeft(p.auction?.endTime)}</span>
                                        </div>
                                        <div className="lp-property-price">
                                            <div>
                                                <small>Current Bid</small>
                                                <strong>£{(p.auction?.currentPrice || p.auction?.currentHighestBid || p.reservePrice)?.toLocaleString()}</strong>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="lp-empty-msg">No live auctions right now — check back soon.</div>
                        )}
                    </div>
                )}
                {/* "Browse All Auctions" button was deleted from here */}
            </section>

            <section className="lp-how">
                <div className="lp-section-title">
                    <h2>How It Works</h2>
                    <p>Simple and transparent property trading</p>
                </div>

                <div className="lp-how-tabs">
                    <button className={howTab === "buyer" ? "lp-tab active" : "lp-tab"} onClick={() => setHowTab("buyer")}>Buying</button>
                    <button className={howTab === "seller" ? "lp-tab active" : "lp-tab"} onClick={() => setHowTab("seller")}>Selling</button>
                </div>

                <div className="lp-steps">
                    {(howTab === "buyer"
                            ? [
                                { n: 1, title: "Search", desc: "Browse properties by location, price, or type." },
                                { n: 2, title: "Bid", desc: "Place bids in real time with live countdown timers." },
                                { n: 3, title: "Win", desc: "Highest bid when the timer ends wins the property." },
                            ]
                            : [
                                { n: 1, title: "List", desc: "Add your property details and set a reserve price." },
                                { n: 2, title: "Auction", desc: "Set the duration and let buyers compete." },
                                { n: 3, title: "Sell", desc: "Accept the winning bid and complete the sale." },
                            ]
                    ).map((step, i) => (
                        <React.Fragment key={step.n}>
                            {i > 0 && <span className="lp-step-arrow">&rarr;</span>}
                            <div className="lp-step-card">
                                <div className="lp-step-num">{step.n}</div>
                                <h3>{step.title}</h3>
                                <p>{step.desc}</p>
                            </div>
                        </React.Fragment>
                    ))}
                </div>
            </section>

            <section className="lp-cta">
                <h2>Ready to Get Started?</h2>
                <p>Join the UK's fastest growing transparent property auction platform.</p>
                <div className="lp-cta-btns">
                    <button className="lp-btn lp-btn-white" onClick={() => navigate("/login", { state: { action: "Sign Up", role: "BUYER" } })}>Start Buying</button>
                    <button className="lp-btn lp-btn-white-outline" onClick={() => navigate("/login", { state: { action: "Sign Up", role: "SELLER" } })}>Start Selling</button>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default LandingPage;