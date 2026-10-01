import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import {
    Elements,
    CardElement,
    useStripe,
    useElements
} from '@stripe/react-stripe-js';
import axios from 'axios';
import Navbar from '../Navbar/Navbar';
import Footer from '../Footer/Footer';
import './PaymentPage.css';


const stripePromise = loadStripe('pk_test_51TABy0ETXc5HCyPJAF4bKM40gd1HIc94Q0fwE4Rxq7Z0DOlaZF9AybHVZ6JNXOZGniCwSgsOBmUyRAWLALgfXifm00pes2dOrY');

//error message extractor
const getErrorMessage = (err) => {
    const data = err?.response?.data;
    if (!data) return err?.message || "An unknown error occurred.";
    if (typeof data === 'string') return data;
    if (data.message) return data.message;
    if (data.error) return data.error;
    return "Something went wrong. Please try again.";
};

// ── Card Form Component ──
const CheckoutForm = ({ clientSecret, paymentDetails, onSuccess }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!stripe || !elements) return;

        setProcessing(true);
        setError(null);

        const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
            clientSecret,
            {
                payment_method: {
                    card: elements.getElement(CardElement),
                }
            }
        );

        if (stripeError) {
            setError(stripeError.message);
            setProcessing(false);
        } else if (paymentIntent.status === 'succeeded') {
            try {
                await axios.post(
                    'http://localhost:8080/api/payments/confirm',
                    null,
                    { params: { paymentIntentId: paymentIntent.id } }
                );
                onSuccess();
            } catch (err) {
                setError('Payment succeeded but confirmation failed. Contact support.');
            }
            setProcessing(false);
        }
    };

    const cardStyle = {
        style: {
            base: {
                fontSize: '16px',
                fontFamily: 'inherit',
                color: '#1e1e2d',
                '::placeholder': { color: '#8e8ea0' },
            },
            invalid: { color: '#dc2626' },
        },
    };

    return (
        <form onSubmit={handleSubmit} className="pay-form">
            <div className="pay-card-input">
                <label>Card Details</label>
                <div className="pay-card-element">
                    <CardElement options={cardStyle} />
                </div>
            </div>

            {error && (
                <div className="pay-error">
                    ⚠️ {error}
                </div>
            )}

            <button
                type="submit"
                className="pay-submit-btn"
                disabled={!stripe || processing}
            >
                {processing
                    ? 'Processing...'
                    : `Pay Deposit — £${paymentDetails.depositAmount?.toLocaleString()}`
                }
            </button>

            <div className="pay-test-info">
                <p><strong>Test Card Numbers:</strong></p>
                <p>✅ Success: <code>4242 4242 4242 4242</code></p>
                <p>❌ Decline: <code>4000 0000 0000 0002</code></p>
                <p>🔐 Auth Required: <code>4000 0025 0000 3155</code></p>
                <p>Use any future date, any CVC, any postcode.</p>
            </div>
        </form>
    );
};

// ── Main Payment Page ──
const PaymentPage = () => {
    const { auctionId } = useParams();
    const navigate = useNavigate();
    const username = sessionStorage.getItem('username');

    const [clientSecret, setClientSecret] = useState(null);
    const [paymentDetails, setPaymentDetails] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [paid, setPaid] = useState(false);
    const [existingPayment, setExistingPayment] = useState(null);

    //Create the guard variable to stop double requests
    const hasRequested = useRef(false);

    //Extracted into a function so we can call it again on retry
    const initPayment = async () => {
        setLoading(true);
        setError(null);

        try {
            // Check if already paid
            const statusRes = await axios.get(
                'http://localhost:8080/api/payments/status',
                { params: { auctionId, username } }
            );

            if (statusRes.data?.status === 'COMPLETED') {
                setExistingPayment(statusRes.data);
                setPaid(true);
                setLoading(false);
                return;
            }

            // Create fresh payment intent
            const res = await axios.post(
                'http://localhost:8080/api/payments/create-intent',
                null,
                { params: { auctionId, buyerUsername: username } }
            );

            setClientSecret(res.data.clientSecret);
            setPaymentDetails(res.data);
        } catch (err) {
            //extract a string message
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!username) {
            navigate('/');
            return;
        }

        //If the request has already fired once, stop the second strict-mode request
        if (hasRequested.current) return;
         hasRequested.current = true;

        initPayment();
    }, [auctionId, username]);

    const handleSuccess = () => {
        setPaid(true);
    };

    if (loading) {
        return (
            <div className="pay-page">
                <Navbar />
                <div className="pay-loading">
                    <div className="pay-spinner" />
                    <p>Preparing your payment...</p>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className="pay-page">
            <Navbar />

            <div className="pay-container">

                {/* ── Success State ── */}
                {paid ? (
                    <div className="pay-success">
                        <div className="pay-success-icon">✅</div>
                        <h1>Payment Successful!</h1>
                        <p>Your deposit has been received and the property is now secured.</p>

                        <div className="pay-receipt">
                            <h3>Receipt</h3>
                            <div className="pay-receipt-row">
                                <span>Property</span>
                                <strong>
                                    {paymentDetails.propertyTitle
                                        || existingPayment?.propertyId
                                        || 'Property'}
                                </strong>
                            </div>
                            <div className="pay-receipt-row">
                                <span>Winning Bid</span>
                                <strong>
                                    £{(paymentDetails.totalPrice
                                    || existingPayment?.totalPrice
                                    || 0).toLocaleString()}
                                </strong>
                            </div>
                            <div className="pay-receipt-row highlight">
                                <span>Deposit Paid</span>
                                <strong>
                                    £{(paymentDetails.depositAmount
                                    || existingPayment?.depositAmount
                                    || 0).toLocaleString()}
                                </strong>
                            </div>
                        </div>


                        <div className="pay-next-steps">
                            <h3>What Happens Next?</h3>
                            <ol>
                                <li>Auction details have been logged and forwarded to the agency.</li>
                                <li>Your conveyancing solicitor will receive the final contract.</li>
                                <li>Property transfer is typically completed within 28 days.</li>
                            </ol>
                        </div>

                        <button
                            className="pay-back-btn"
                            onClick={() => navigate('/buyer-dashboard')}
                        >
                            Back to Dashboard
                        </button>
                    </div>
                ) : error ? (
                    /* ── Error State — with RETRY button ── */
                    <div className="pay-error-page">
                        <div className="pay-error-icon">⚠️</div>
                        <h1>Payment Issue</h1>
                        <p>{error}</p>

                        {/* Retry button — clears error and tries again */}
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
                            <button
                                className="pay-submit-btn"
                                style={{ maxWidth: '200px' }}
                                onClick={initPayment}
                            >
                                Try Again
                            </button>
                            <button
                                className="pay-back-btn"
                                onClick={() => navigate('/buyer-dashboard')}
                            >
                                Back to Dashboard
                            </button>
                        </div>
                    </div>
                ) : (
                    /* ── Payment Form ── */
                    <>
                        <div className="pay-header">
                            <h1>Complete Your Purchase</h1>
                            <p>Pay your 10% deposit to secure this property</p>
                        </div>

                        <div className="pay-grid">
                            <div className="pay-summary">
                                <h3>Order Summary</h3>

                                <div className="pay-property-card">
                                    <div className="pay-property-img">🏠</div>
                                    <div className="pay-property-info">
                                        <h4>{paymentDetails.propertyTitle}</h4>
                                    </div>
                                </div>

                                <div className="pay-breakdown">
                                    <div className="pay-line">
                                        <span>Winning Bid</span>
                                        <span>£{paymentDetails.totalPrice?.toLocaleString()}</span>
                                    </div>
                                    <div className="pay-line">
                                        <span>Deposit (10%)</span>
                                        <span>£{paymentDetails.depositAmount?.toLocaleString()}</span>
                                    </div>
                                    <div className="pay-line total">
                                        <span>Due Now</span>
                                        <span>£{paymentDetails.depositAmount?.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="pay-trust">
                                    <div>🔒 Secure Payment</div>
                                    <div>💳 Powered by Stripe</div>
                                </div>
                            </div>

                            <div className="pay-form-section">
                                <h3>Payment Details</h3>
                                {clientSecret && (
                                    <Elements stripe={stripePromise} options={{ clientSecret }}>
                                        <CheckoutForm
                                            clientSecret={clientSecret}
                                            paymentDetails={paymentDetails}
                                            onSuccess={handleSuccess}
                                        />
                                    </Elements>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>

            <Footer />
        </div>
    );
};

export default PaymentPage;