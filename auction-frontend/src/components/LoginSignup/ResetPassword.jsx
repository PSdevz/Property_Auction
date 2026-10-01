import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../Navbar/Navbar';
import Footer from '../Footer/Footer';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [message, setMessage] = useState("");
    const [isError, setIsError] = useState(false);

    const handleReset = async (e) => {
        e.preventDefault();

        if (newPassword.length < 8) {
            setMessage("Password must be at least 8 characters long.");
            setIsError(true);
            return;
        }

        if (newPassword !== confirmPassword) {
            setMessage("Passwords do not match.");
            setIsError(true);
            return;
        }

        try {
            const response = await axios.post('http://localhost:8080/api/auth/reset-password', {
                token: token,
                newPassword: newPassword
            });

            alert("Password updated successfully! You can now log in.");
            navigate('/login');
        } catch (error) {
            setMessage(error.response?.data || "Error: Link expired or invalid.");
            setIsError(true);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f8f8f8' }}>
            <Navbar />
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                <div style={{
                    background: 'white', padding: '40px', borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)', textAlign: 'center', maxWidth: '400px', width: '100%'
                }}>
                    <h2 style={{ marginBottom: '20px' }}>Set New Password</h2>

                    {message && (
                        <p style={{ color: isError ? '#dc2626' : '#059669', marginBottom: '15px' }}>
                            {message}
                        </p>
                    )}

                    <form onSubmit={handleReset}>
                        <input
                            type="password"
                            placeholder="New Password (min 8 chars)"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            style={{ width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #ccc' }}
                            required
                        />
                        <input
                            type="password"
                            placeholder="Confirm New Password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '8px', border: '1px solid #ccc' }}
                            required
                        />
                        <button type="submit" style={{
                            width: '100%', padding: '12px', background: '#1e1e2d', color: 'white',
                            border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer'
                        }}>
                            Update Password
                        </button>
                    </form>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default ResetPassword;