import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
    const navigate = useNavigate();

    return (
        <footer className="main-footer">
            <div className="footer-content">
                <div className="footer-section">
                    <h3>AuctionPro</h3>
                    <p>Modern property auctions, built for transparency.</p>
                </div>

                <div className="footer-links">
                    <span onClick={() => navigate('/about')} style={{ cursor: 'pointer' }}>About Us</span>
                    <span>|</span>
                    <span>Support: helpauctionpro@gmail.com</span>
                </div>

                <div className="footer-bottom" style={{ marginTop: '20px', opacity: '0.7', fontSize: '12px' }}>
                    &copy; {new Date().getFullYear()} AuctionPro. All Rights Reserved.
                </div>
            </div>
        </footer>
    );
};

export default Footer;