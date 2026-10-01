package com.ps515.auctionbackend.service;

import com.ps515.auctionbackend.model.Auction;
import com.ps515.auctionbackend.model.ListingStatus;
import com.ps515.auctionbackend.model.Payment;
import com.ps515.auctionbackend.model.Property;
import com.ps515.auctionbackend.repository.AuctionRepository;
import com.ps515.auctionbackend.repository.PaymentRepository;
import com.ps515.auctionbackend.repository.PropertyRepository;
import com.stripe.Stripe;
import com.stripe.model.PaymentIntent;
import com.stripe.param.PaymentIntentCreateParams;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class PaymentService {

    @Autowired
    private SuspensionService suspensionService;
    @Value("${stripe.secret.key}")
    private String stripeSecretKey;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private AuctionRepository auctionRepository;

    @Autowired
    private PropertyRepository propertyRepository;

    @PostConstruct
    public void init() {
        Stripe.apiKey = stripeSecretKey;
    }

    public Map<String, Object> createPaymentIntent(
            Long auctionId, String buyerUsername) throws Exception {

        Auction auction = auctionRepository.findById(auctionId)
                .orElseThrow(() -> new RuntimeException("Auction not found"));

        if (!buyerUsername.equals(auction.getHighestBidder())) {
            throw new RuntimeException("You did not win this auction.");
        }

        List<Payment> existingPayments = paymentRepository
                .findAllByAuctionIdAndBuyerUsername(auctionId, buyerUsername);

        for (Payment p : existingPayments) {
            if (p.getStatus() == Payment.PaymentStatus.COMPLETED) {
                throw new RuntimeException("Payment already completed.");
            }
        }

        if (!existingPayments.isEmpty()) {
            paymentRepository.deleteAll(existingPayments);
        }

        Double winningBid = auction.getCurrentHighestBid();
        Double depositAmount = Math.round(winningBid * 0.10 * 100.0) / 100.0;
        long amountInPence = Math.round(depositAmount * 100);

        PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                .setAmount(amountInPence)
                .setCurrency("gbp")
                .setDescription("Deposit for " + auction.getProperty().getTitle())
                .putMetadata("auctionId", auctionId.toString())
                .putMetadata("buyerUsername", buyerUsername)
                .build();

        PaymentIntent intent = PaymentIntent.create(params);

        Payment payment = new Payment();
        payment.setPropertyId(auction.getProperty().getId());
        payment.setAuctionId(auctionId);
        payment.setBuyerUsername(buyerUsername);
        payment.setTotalPrice(winningBid);
        payment.setDepositAmount(depositAmount);
        payment.setStripePaymentIntentId(intent.getId());
        payment.setStatus(Payment.PaymentStatus.PENDING);
        paymentRepository.save(payment);

        // SET AWAITING_PAYMENT STATUS AND DEADLINE ON THE AUCTION
        auction.setStatus("AWAITING_PAYMENT");
        auction.setPaymentDeadline(LocalDateTime.now().plusMinutes(30));
        auctionRepository.save(auction);
        System.out.println("Auction #" + auctionId + " set to AWAITING_PAYMENT. "
                + "Deadline: " + auction.getPaymentDeadline());

        Map<String, Object> response = new HashMap<>();
        response.put("clientSecret", intent.getClientSecret());
        response.put("depositAmount", depositAmount);
        response.put("totalPrice", winningBid);
        response.put("propertyTitle", auction.getProperty().getTitle());
        response.put("paymentId", payment.getId());

        return response;
    }

    public Payment confirmPayment(String paymentIntentId) {
        Payment payment = paymentRepository
                .findByStripePaymentIntentId(paymentIntentId)
                .orElseThrow(() -> new RuntimeException("Payment not found"));

        payment.setStatus(Payment.PaymentStatus.COMPLETED);
        payment.setPaidAt(LocalDateTime.now());
        paymentRepository.save(payment);

        // CLEAR the payment deadline when paid — prevents false strikes
        Auction auction = auctionRepository.findById(payment.getAuctionId()).orElse(null);
        if (auction != null) {
            auction.setStatus("SOLD");
            auction.setPaymentDeadline(null);
            auctionRepository.save(auction);
        }

        Property property = propertyRepository.findById(payment.getPropertyId()).orElse(null);
        if (property != null) {
            property.setListingStatus(ListingStatus.SOLD);
            propertyRepository.save(property);
        }

        return payment;
    }

    public Payment getPaymentStatus(Long auctionId, String username) {
        List<Payment> payments = paymentRepository
                .findAllByAuctionIdAndBuyerUsername(auctionId, username);

        if (payments.isEmpty()) return null;

        for (Payment p : payments) {
            if (p.getStatus() == Payment.PaymentStatus.COMPLETED) return p;
        }

        return payments.get(payments.size() - 1);
    }

    public List<Payment> getUserPayments(String username) {
        return paymentRepository.findByBuyerUsername(username);
    }
}