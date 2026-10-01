import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import './LoginSignup.css';
import user_icon from '../assets/person.png';
import email_icon from '../assets/email.png';
import password_icon from '../assets/password.png';

const extractErrorMessage = (error, fallback) => {
    const data = error.response?.data;
    if (!data) return fallback;
    if (typeof data === 'string') return data;
    if (typeof data === 'object') {
        return data.message || data.error || data.detail || fallback;
    }
    return fallback;
};

const LoginSignup = () => {
    // action can now be: "Sign Up", "Login", or "Reset Password"
    const [action, setAction] = useState("Sign Up");
    const [showSuccess, setShowSuccess] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();

    const [formdata, setFormData] = useState({
        username: "",
        password: "",
        email: "",
        role: "BUYER"
    });

    useEffect(() => {
        if (location.pathname === '/login') {
            setAction("Login");
        } else if (location.pathname === '/register' || location.pathname === '/signup') {
            setAction("Sign Up");
        }

        if (location.state) {
            if (location.state.action) setAction(location.state.action);
            if (location.state.role) setFormData(prev => ({ ...prev, role: location.state.role }));
        }
    }, [location.pathname, location.state]);

    const handleLogin = async () => {
        try {
            const response = await axios.post('http://localhost:8080/api/auth/login', {
                username: formdata.username,
                password: formdata.password,
            });
            const userRole = (response.data.role || "").toUpperCase();

            //Saving the token AND the username securely
            if (response.data.token) {
                sessionStorage.setItem("token", response.data.token);
            }
            sessionStorage.setItem("username", formdata.username);
            sessionStorage.setItem("role", userRole);

            // Redirect to the correct dashboard
            if (userRole === "ADMIN") navigate('/admin-dashboard');
            else if (userRole === "SELLER") navigate('/seller-dashboard');
            else navigate('/buyer-dashboard');

        } catch (error) {
            alert(extractErrorMessage(error, "Login failed. Check your credentials."));
        }
    };

    const handleSignUp = async () => {
        if (formdata.password.length < 8) {
            alert("Password must be at least 8 characters long.");
            return;
        }
        try {
            await axios.post('http://localhost:8080/api/auth/register', {
                username: formdata.username,
                email: formdata.email,
                password: formdata.password,
                role: formdata.role
            });
            setShowSuccess(true);
        } catch (error) {
            alert(extractErrorMessage(error, "Registration failed."));
        }
    };

    const handleSendResetLink = async () => {
        if (!formdata.email) {
            alert("Please enter your email to receive a reset link.");
            return;
        }
        try {
            await axios.post('http://localhost:8080/api/auth/forgot-password', {
                email: formdata.email
            });
            alert("Check your email for a reset link!");
            setAction("Login"); // Take them back to login after sending
        } catch (error) {
            alert(extractErrorMessage(error, "Email not found."));
        }
    };

    if (showSuccess) {
        return (
            <div className="container" style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: '4rem' }}>✉️</div>
                <h2>Check Your Email!</h2>
                <p>A verification link was sent to <strong>{formdata.email}</strong>.</p>
                <p style={{ fontSize: '0.8rem', marginTop: '20px' }}>You can safely close this tab.</p>
            </div>
        );
    }

    return (
        <div className="login-page-wrapper">
            <div className="container">
                <div className="header">
                    <div className="text">{action}</div>
                    <div className="underline"></div>
                </div>

                <div className="inputs">
                    {/* USERNAME: Only show for Login or Sign Up */}
                    {action !== "Reset Password" && (
                        <div className="input">
                            <img src={user_icon} alt="user" />
                            <input
                                type="text"
                                placeholder="Username"
                                value={formdata.username}
                                onChange={(e) => setFormData({ ...formdata, username: e.target.value })}
                            />
                        </div>
                    )}

                    {/* EMAIL: Show for Sign Up OR Reset Password */}
                    {(action === "Sign Up" || action === "Reset Password") && (
                        <div className="input">
                            <img src={email_icon} alt="email" />
                            <input
                                type="email"
                                placeholder="Email Address"
                                value={formdata.email}
                                onChange={(e) => setFormData({ ...formdata, email: e.target.value })}
                            />
                        </div>
                    )}

                    {/* PASSWORD: Only show for Login or Sign Up */}
                    {action !== "Reset Password" && (
                        <div className="input">
                            <img src={password_icon} alt="password" />
                            <input
                                type="password"
                                placeholder="Password"
                                value={formdata.password}
                                onChange={(e) => setFormData({ ...formdata, password: e.target.value })}
                            />
                        </div>
                    )}

                    {/* ROLE: Only show for Sign Up */}
                    {action === "Sign Up" && (
                        <div className="role-container">
                            <div className={formdata.role === "BUYER" ? "role-card active" : "role-card"}
                                 onClick={() => setFormData({ ...formdata, role: "BUYER" })}>Buyer</div>
                            <div className={formdata.role === "SELLER" ? "role-card active" : "role-card"}
                                 onClick={() => setFormData({ ...formdata, role: "SELLER" })}>Seller</div>
                        </div>
                    )}
                </div>

                {/* Links and Buttons */}
                {action === "Login" && (
                    <div className="forgot-password">
                        Forgot Password? <span onClick={() => setAction("Reset Password")}>Click Here!</span>
                    </div>
                )}

                {action === "Reset Password" && (
                    <div className="forgot-password">
                        Remember your password? <span onClick={() => setAction("Login")}>Back to Login</span>
                    </div>
                )}

                <div className="submit-container">
                    {action === "Reset Password" ? (
                        <div className="submit" onClick={handleSendResetLink} style={{ width: '100%' }}>
                            Send Reset Link
                        </div>
                    ) : (
                        <>
                            <div className={action === "Login" ? "submit gray" : "submit"}
                                 onClick={() => action === "Sign Up" ? handleSignUp() : setAction("Sign Up")}>
                                Sign Up
                            </div>
                            <div className={action === "Sign Up" ? "submit gray" : "submit"}
                                 onClick={() => action === "Login" ? handleLogin() : setAction("Login")}>
                                Login
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LoginSignup;