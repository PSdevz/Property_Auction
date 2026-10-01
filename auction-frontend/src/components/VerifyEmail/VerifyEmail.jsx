import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom'; //Added useNavigate
import axios from 'axios';
import Navbar from '../Navbar/Navbar';
import Footer from '../Footer/Footer';

const VerifyEmail = () => {

    //GRAB TOKEN FRO URL WHEN USER CLICKS ON THE VERIFICATION LINK
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    //Initialize navigate
    const navigate = useNavigate();

    const [status, setStatus] = useState('loading');
    const [message, setMessage] = useState('Verifying your email...');
    const hasFetched = useRef(false);

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('No verification token found in the URL.');
            return;
        }
        if (hasFetched.current) return;
        hasFetched.current = true;

        const verifyToken = async () => {
            try {
                const response = await axios.post('http://localhost:8080/api/auth/verify-email', { token });
                setStatus('success');
                setMessage(response.data.message || 'Email verified successfully!');

                // Automatically redirect to login after 2 seconds
                setTimeout(() => {
                    navigate('/login');
                }, 2000);

            } catch (error) {
                setStatus('error');
                setMessage(error.response?.data?.message || 'Verification failed. The link may have expired.');
            }
        };

        verifyToken();
    }, [token, navigate]); // Added navigate to dependency array

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f8f8f8' }}>
            <Navbar />
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                <div style={{
                    background: 'white', padding: '40px', borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)', textAlign: 'center', maxWidth: '400px', width: '100%'
                }}>
                    {status === 'loading' && (
                        <>
                            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>⏳</div>
                            <h2 style={{ color: '#1e1e2d' }}>{message}</h2>
                            <p style={{ color: '#6e6e80' }}>Please wait while we confirm your details.</p>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>✅</div>
                            <h2 style={{ color: '#059669' }}>Verified!</h2>
                            <p style={{ color: '#6e6e80', marginBottom: '20px' }}>
                                {message} <br/><br/>
                                <em>Redirecting to login...</em> {/* Let the user know they are moving */}
                            </p>
                            <Link to="/login" style={{
                                display: 'inline-block', background: '#1e1e2d', color: 'white',
                                padding: '10px 20px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold'
                            }}>
                                Go to Login Now
                            </Link>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>❌</div>
                            <h2 style={{ color: '#dc2626' }}>Verification Failed</h2>
                            <p style={{ color: '#6e6e80', marginBottom: '20px' }}>{message}</p>
                            <Link to="/register" style={{
                                display: 'inline-block', border: '1px solid #1e1e2d', color: '#1e1e2d',
                                padding: '10px 20px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold'
                            }}>
                                Sign Up Again
                            </Link>
                        </>
                    )}
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default VerifyEmail;