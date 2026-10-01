import React, { useState } from 'react';
import axios from 'axios';

const EditBids = ({ property }) => {
    const [showTicketModal, setShowTicketModal] = useState(false);
    const [ticketMessage, setTicketMessage] = useState("");

    const handleSendTicket = async () => {
        if (!ticketMessage.trim()) return;

        try {
            await axios.post('http://localhost:8080/api/tickets', {
                propertyId: property.id,
                subject: `Correction Request: ${property.title}`,
                message: ticketMessage,
                senderUsername: sessionStorage.getItem("username") || "Seller"
            });

            alert("Message sent to Admin. We will review your request shortly.");
            setShowTicketModal(false);
            setTicketMessage("");
        } catch (error) {
            console.error("Ticket Error:", error);
            alert("Failed to send message. Please check your connection.");
        }
    };

    if (!property) return null;

    return (
        <div style={{ width: '100%' }}>
            <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '14px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#475569', fontSize: '0.85rem' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    <span><strong>Fields locked:</strong> Active bids prevent changes to Start Date, Duration, and Reserve Price.</span>
                </div>

                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        setShowTicketModal(true);
                    }}
                    style={{
                        backgroundColor: 'white',
                        border: '1px solid #cbd5e1',
                        color: '#0f172a',
                        fontWeight: '600',
                        fontSize: '0.8rem',
                        padding: '6px 14px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#f1f5f9'}
                    onMouseOut={(e) => e.target.style.backgroundColor = 'white'}
                >
                    Request Change
                </button>
            </div>

            {showTicketModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 9999, padding: '20px'
                }}>
                    <div style={{
                        background: 'white', padding: 32, borderRadius: 20, width: '100%', maxWidth: 450,
                        boxShadow: '0 10px 40px rgba(0,0,0,0.2)', textAlign: 'left'
                    }}>
                        <h3 style={{ marginTop: 0, marginBottom: 12, color: '#1e1e2d', fontSize: '1.4rem' }}>
                            Request Listing Change
                        </h3>
                        <p style={{ fontSize: '0.9rem', color: '#555', marginBottom: 24, lineHeight: 1.5 }}>
                            Because <strong>{property.title}</strong> has active bids, key details are locked to ensure fairness for current bidders. <br/><br/>
                            Please explain what needs to be changed. An admin will review your request.
                        </p>
                        <textarea
                            rows="5"
                            value={ticketMessage}
                            onChange={(e) => setTicketMessage(e.target.value)}
                            placeholder="Type your requested changes here..."
                            style={{
                                width: '100%', padding: '12px 14px', border: '2px solid #e0e0e8', borderRadius: 10,
                                fontSize: '0.92rem', fontFamily: 'inherit', resize: 'vertical', marginBottom: 24, boxSizing: 'border-box', outline: 'none'
                            }}
                        />
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                            <button
                                type="button"
                                onClick={() => setShowTicketModal(false)}
                                style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid #ebebf0', background: 'white', cursor: 'pointer', fontWeight: 600, color: '#555' }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSendTicket}
                                style={{ padding: '10px 20px', borderRadius: 10, background: '#1e1e2d', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                            >
                                Send to Admin
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EditBids;