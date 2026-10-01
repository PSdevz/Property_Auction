package com.ps515.auctionbackend.controller;

import com.ps515.auctionbackend.model.Payment;
import com.ps515.auctionbackend.service.PaymentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@CrossOrigin(origins = "http://localhost:3000")
public class PaymentController {

    @Autowired
    private PaymentService paymentService;

    // Create payment intent
    @PostMapping("/create-intent")
    public ResponseEntity<?> createPaymentIntent(
            @RequestParam Long auctionId,
            @RequestParam String buyerUsername) {
        try {
            Map<String, Object> result = paymentService
                    .createPaymentIntent(auctionId, buyerUsername);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            System.err.println("Payment intent error: " + e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // Confirm payment
    @PostMapping("/confirm")
    public ResponseEntity<?> confirmPayment(
            @RequestParam String paymentIntentId) {
        try {
            Payment payment = paymentService.confirmPayment(paymentIntentId);
            return ResponseEntity.ok(payment);
        } catch (Exception e) {
            System.err.println("Payment confirm error: " + e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    //Check payment status
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getPaymentStatus(
            @RequestParam Long auctionId,
            @RequestParam String username) {

        Map<String, Object> response = new HashMap<>();

        try {
            Payment payment = paymentService.getPaymentStatus(auctionId, username);

            if (payment == null) {
                response.put("status", "NOT_STARTED");
                return ResponseEntity.ok(response);
            }

            response.put("status", payment.getStatus().toString());
            response.put("depositAmount", payment.getDepositAmount());
            response.put("totalPrice", payment.getTotalPrice());
            response.put("paidAt", payment.getPaidAt());
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            System.err.println("Payment status error: " + e.getMessage());
            response.put("status", "NOT_STARTED");
            return ResponseEntity.ok(response);
        }
    }

    // Get all user payments
    @GetMapping("/user/{username}")
    public ResponseEntity<?> getUserPayments(
            @PathVariable String username) {
        try {
            List<Payment> payments = paymentService.getUserPayments(username);
            return ResponseEntity.ok(payments);
        } catch (Exception e) {
            return ResponseEntity.ok(List.of());
        }
    }
}