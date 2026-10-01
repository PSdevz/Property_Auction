import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PaymentPage from './components/Payment/PaymentPage';
import LandingPage from './components/LandingPage/LandingPage';
import LoginSignup from './components/LoginSignup/LoginSignup';
import ResetPassword from './components/LoginSignup/ResetPassword';

import VerifyEmail from './components/VerifyEmail/VerifyEmail';
import PropertySearch from './components/PropertySearch/PropertySearch';
import PropertyDetail from './components/Auction/PropertyDetail';
import SellerDashboard from './components/Dashboard/SellerDashboard';
import BuyerDashboard from "./components/Dashboard/BuyerDashboard";
import AdminDashboard from "./components/Dashboard/AdminDashboard";
import AboutUs from "./components/AboutUs/AboutUs";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";

function App() {
    return (
        <Router>
            <Routes>
                {/* Default Landing Page */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                {/* Authentication */}
                <Route path="/login" element={<LoginSignup />} />

                <Route path="/verify-email" element={<VerifyEmail />} />
                {/* General */}
                <Route path="/about" element={<AboutUs />} />

                {/* Buyer only */}
                <Route path="/buyer-dashboard" element={
                    <ProtectedRoute allowedRoles={["BUYER"]}>
                        <BuyerDashboard />
                    </ProtectedRoute>
                } />
                <Route path="/payment/:auctionId" element={
                    <ProtectedRoute allowedRoles={["BUYER"]}>
                        <PaymentPage />
                    </ProtectedRoute>
                } />
                <Route path="/properties" element={
                    <ProtectedRoute allowedRoles={["BUYER"]}>
                        <PropertySearch />
                    </ProtectedRoute>
                } />
                <Route path="/property/:id" element={
                    <ProtectedRoute allowedRoles={["BUYER"]}>
                        <PropertyDetail />
                    </ProtectedRoute>
                } />

                {/* Seller only */}
                <Route path="/seller-dashboard" element={
                    <ProtectedRoute allowedRoles={["SELLER"]}>
                        <SellerDashboard />
                    </ProtectedRoute>
                } />

                {/* Admin only */}
                <Route path="/admin-dashboard" element={
                    <ProtectedRoute allowedRoles={["ADMIN"]}>
                        <AdminDashboard />
                    </ProtectedRoute>
                } />

            </Routes>
        </Router>
    );
}

export default App;