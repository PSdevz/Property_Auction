import React from 'react';
import Navbar from "../Navbar/Navbar";
import Footer from "../Footer/Footer";
import { useNavigate } from 'react-router-dom';

const AboutUs = () => {
    const navigate = useNavigate();

    const features = [
        {
            icon: '⚡',
            title: 'Real-Time Bidding',
            description: 'Live countdown timers and instant bid updates. The platform polls for changes every 10 seconds and reflects them immediately across all active sessions.',
        },
        {
            icon: '🤖',
            title: 'Proxy Bidding Engine',
            description: 'Set a maximum price and the system bids on your behalf using the minimum increment needed to stay in the lead — stopping exactly at your limit.',
        },
        {
            icon: '🔒',
            title: 'Secure Payments',
            description: 'Deposit payments are handled via Stripe. Card details are never stored on our servers — all sensitive data is processed directly by Stripe.',
        },
        {
            icon: '📋',
            title: 'Seller Ticket System',
            description: 'Sellers can request changes to auction terms through a formal ticket process. If bids exist, the auction is cancelled rather than modified unfairly.',
        },
        {
            icon: '🛡️',
            title: 'Admin Controls',
            description: 'A full admin panel allows platform management: suspending accounts, managing listings, monitoring payments, and resolving support tickets.',
        },
        {
            icon: '📱',
            title: 'Responsive Design',
            description: 'Built with React and a mobile-first layout. The platform works across desktop, tablet, and mobile without any loss of functionality.',
        },
    ];

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            background: '#f7f7f9',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            color: '#1e1e2d',
            WebkitFontSmoothing: 'antialiased',
        }}>
            <Navbar />

            <div style={{ flex: 1, maxWidth: 1080, margin: '0 auto', padding: '48px 24px 80px', width: '100%' }}>

                {/* ── Hero ── */}
                <div style={{ textAlign: 'center', marginBottom: 64 }}>
                    <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#8e8ea0', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 12 }}>
                        About This Project
                    </p>
                    <h1 style={{ fontSize: '2.4rem', fontWeight: 800, color: '#1e1e2d', lineHeight: 1.2, letterSpacing: '-0.5px', marginBottom: 16 }}>
                        A digital platform for<br />transparent property auctions
                    </h1>
                    <p style={{ fontSize: '1rem', color: '#6e6e80', maxWidth: 580, margin: '0 auto', lineHeight: 1.8, fontWeight: 400 }}>
                        This platform was developed as a final year Computer Science project. It explores how
                        automated systems can replace manual processes in property auctions — from proxy bidding
                        to deposit enforcement — reducing human error and improving transparency for both buyers and sellers.
                    </p>
                </div>

                {/* ── What was built ── */}
                <div style={{ background: 'white', border: '1px solid #ebebf0', borderRadius: 16, padding: '40px 36px', marginBottom: 48 }}>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e1e2d', marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #f0f0f5' }}>
                        What was built
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <p style={{ fontSize: '0.95rem', color: '#555', lineHeight: 1.8, margin: 0 }}>
                            The UK property auction market has historically suffered from high fall-through rates,
                            often caused by winners who withdraw after the hammer falls with no financial consequence.
                            Modern conditional auction formats have partially addressed this, but most existing platforms
                            still rely on manual follow-ups for payment tracking and default handling.
                        </p>
                        <p style={{ fontSize: '0.95rem', color: '#555', lineHeight: 1.8, margin: 0 }}>
                            This project builds a full-stack web application using React, Java Spring Boot, and MySQL,
                            with Stripe for payment processing. The core challenge was designing automated workflows
                            that handle the post-auction process without human intervention — including a 24-hour deposit
                            window, automatic default detection, and a second-chance offer system for the underbidder.
                        </p>
                        <p style={{ fontSize: '0.95rem', color: '#555', lineHeight: 1.8, margin: 0 }}>
                            The proxy bidding engine follows RICS-aligned increment bands and mirrors the behaviour
                            of established platforms such as Rightmove Auctions and Bid4Assets — bidding the minimum
                            amount necessary to stay in the lead rather than jumping by a fixed amount each time.
                        </p>
                    </div>
                </div>

                {/* ── Features grid ── */}
                <div style={{ marginBottom: 64 }}>
                    <div style={{ textAlign: 'center', marginBottom: 32 }}>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e1e2d', marginBottom: 8 }}>Platform features</h2>
                        <p style={{ fontSize: '0.9rem', color: '#8e8ea0', fontWeight: 500 }}>Key technical components implemented in this project.</p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                        {features.map((f, i) => (
                            <div key={i} style={{ background: 'white', border: '1px solid #ebebf0', borderRadius: 14, padding: '28px 24px' }}>
                                <div style={{ fontSize: '1.4rem', marginBottom: 12, lineHeight: 1 }}>{f.icon}</div>
                                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e1e2d', marginBottom: 8 }}>{f.title}</h3>
                                <p style={{ fontSize: '0.83rem', color: '#6e6e80', lineHeight: 1.7, margin: 0 }}>{f.description}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Developer ── */}
                <div style={{ marginBottom: 48 }}>
                    <div style={{ textAlign: 'center', marginBottom: 28 }}>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e1e2d', marginBottom: 8 }}>Developer</h2>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <div style={{ background: 'white', border: '1px solid #ebebf0', borderRadius: 14, padding: '32px 40px', textAlign: 'center', minWidth: 260 }}>
                            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f7f7f9', border: '1px solid #ebebf0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', margin: '0 auto 16px' }}>
                                👨‍💻
                            </div>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e1e2d', marginBottom: 4 }}>Prabhjot Singh</h3>
                            <p style={{ fontSize: '0.82rem', color: '#8e8ea0', fontWeight: 500, margin: '0 0 4px' }}>BSc Computer Science</p>
                            <p style={{ fontSize: '0.82rem', color: '#8e8ea0', fontWeight: 400, margin: 0 }}>Final Year Project — 2025/26</p>
                        </div>
                    </div>
                </div>

                {/* ── CTA ── */}
                <div style={{ background: '#1e1e2d', borderRadius: 16, padding: '48px 36px', textAlign: 'center' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'white', marginBottom: 10 }}>
                        Browse the platform
                    </h2>
                    <p style={{ fontSize: '0.92rem', color: 'rgba(255,255,255,0.55)', marginBottom: 28, maxWidth: 420, margin: '0 auto 28px', lineHeight: 1.7 }}>
                        See the auction system in action — live listings, real-time bidding, and the full buyer and seller experience.
                    </p>
                    <button
                        onClick={() => navigate('/properties')}
                        style={{ background: 'white', color: '#1e1e2d', border: 'none', padding: '14px 32px', borderRadius: 10, fontSize: '0.92rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.25s' }}
                        onMouseEnter={(e) => { e.target.style.transform = 'translateY(-1px)'; e.target.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)'; }}
                        onMouseLeave={(e) => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = 'none'; }}
                    >
                        View Live Auctions
                    </button>
                </div>

            </div>

            <Footer />
        </div>
    );
};

export default AboutUs;