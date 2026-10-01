import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const [role, setRole] = useState(null);
    const [username, setUsername] = useState(null);

    useEffect(() => {
        if (location.pathname.startsWith("/seller")) {
            setRole("SELLER");
        } else if (location.pathname.startsWith("/buyer")) {
            setRole("BUYER");
        } else if (location.pathname.startsWith("/admin")) {
            setRole("ADMIN");
        } else {
            const storedRole = sessionStorage.getItem("role")?.toUpperCase();
            setRole(storedRole);
        }

        setUsername(sessionStorage.getItem("username"));
    }, [location]);

    const toggleMenu = () => setIsOpen(!isOpen);

    const handleLogout = () => {
        sessionStorage.clear();
        setRole(null);
        setUsername(null);
        setIsOpen(false);
        navigate('/');
    };

    return (
        <>
            <div className="hamburger" onClick={toggleMenu}>
                <div className={isOpen ? "line open" : "line"}></div>
                <div className={isOpen ? "line open" : "line"}></div>
                <div className={isOpen ? "line open" : "line"}></div>
            </div>

            <div className={`sidebar ${isOpen ? "active" : ""}`}>
                <div className="close-btn" onClick={toggleMenu}>&times;</div>

                <div className="sidebar-header">
                    <h2>Auction<span>Pro</span></h2>
                    {username && <p className="user-welcome">Hello, {username}</p>}
                </div>

                <ul className="sidebar-links">
                    {/* Buyer Links */}
                    {role === "BUYER" && (
                        <>
                            <li>
                                <Link to="/properties" onClick={toggleMenu}>
                                    Search Properties
                                </Link>
                            </li>
                            <li>
                                <Link to="/buyer-dashboard" onClick={toggleMenu}>
                                    My Bids
                                </Link>
                            </li>
                        </>
                    )}

                    {/* Seller Links */}
                    {role === "SELLER" && (
                        <li>
                            <Link to="/seller-dashboard" onClick={toggleMenu}>
                                My Listings
                            </Link>
                        </li>
                    )}

                    {/* Admin Links */}
                    {role === "ADMIN" && (
                        <li>
                            <Link to="/admin-dashboard" onClick={toggleMenu}>
                                Admin Panel
                            </Link>
                        </li>
                    )}

                    {/* Common Links */}
                    <li>
                        <Link to="/about" onClick={toggleMenu}>
                            About Us
                        </Link>
                    </li>

                    {username && (
                        <li className="logout-item-row" onClick={handleLogout}>
                            <span className="logout-item" style={{ color: 'red', cursor: 'pointer' }}>
                                Log Out
                            </span>
                        </li>
                    )}
                </ul>
            </div>

            {isOpen && <div className="overlay" onClick={toggleMenu}></div>}
        </>
    );
};

export default Navbar;