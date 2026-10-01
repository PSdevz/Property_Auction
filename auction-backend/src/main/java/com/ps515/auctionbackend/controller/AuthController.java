package com.ps515.auctionbackend.controller;

import com.ps515.auctionbackend.model.PendingUser;
import com.ps515.auctionbackend.model.PasswordReset;
import com.ps515.auctionbackend.model.User;
import com.ps515.auctionbackend.repository.PendingUserRepository;
import com.ps515.auctionbackend.repository.PasswordRepository;
import com.ps515.auctionbackend.repository.UserRepository;
import com.ps515.auctionbackend.service.AuthService;
import com.ps515.auctionbackend.service.EmailService;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:3000")
public class AuthController {

    @Autowired
    private AuthService authService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PendingUserRepository pendingUserRepository;

    @Autowired
    private PasswordRepository passwordRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private EmailService emailService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credentials) {
        String username = credentials.get("username");
        String password = credentials.get("password");

        // Check if user exists in pending users
        Optional<PendingUser> pendingOpt = pendingUserRepository.findByUsername(username);
        if (pendingOpt.isPresent()) {
            return ResponseEntity.status(403).body(Map.of(
                    "message", "Please verify your email address before logging in. Check your inbox."
            ));
        }

        boolean isAuthenticated = authService.verifyLogin(username, password);

        if (isAuthenticated) {
            User user = userRepository.findByUsername(username).get();

            // Block suspended users from logging in
            if (Boolean.TRUE.equals(user.getSuspended())) {
                return ResponseEntity.status(403).body(Map.of(
                        "message", "Your account has been suspended. Please contact support."
                ));
            }

            return ResponseEntity.ok(Map.of(
                    "message", "Login successful!",
                    "username", username,
                    "role", user.getRole()
            ));
        } else {
            return ResponseEntity.status(401).body(Map.of("message", "Invalid credentials"));
        }
    }

    @GetMapping("/check")
    public ResponseEntity<?> checkUserStatus(@RequestParam String username) {
        Optional<User> userOpt = userRepository.findByUsername(username);

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of(
                    "valid", false,
                    "reason", "Account no longer exists."
            ));
        }

        User user = userOpt.get();

        if (Boolean.TRUE.equals(user.getSuspended())) {
            return ResponseEntity.status(403).body(Map.of(
                    "valid", false,
                    "reason", "Your account has been suspended. Please contact support."
            ));
        }

        return ResponseEntity.ok(Map.of(
                "valid", true,
                "role", user.getRole()
        ));
    }

    @PostMapping("/register")
    @Transactional
    public ResponseEntity<?> registerUser(@RequestBody User registrationData) {

        if (registrationData.getPassword() == null || registrationData.getPassword().length() < 8) {
            return ResponseEntity.badRequest().body(Map.of("message", "Error: Password must be at least 8 characters long."));
        }

        // Check if username exists in BOTH tables
        if (userRepository.findByUsername(registrationData.getUsername()).isPresent() ||
                pendingUserRepository.findByUsername(registrationData.getUsername()).isPresent()) {
            return ResponseEntity.badRequest().body("Error: Username is already taken!");
        }

        // Check if email exists in BOTH tables
        if (userRepository.findByEmail(registrationData.getEmail()).isPresent() ||
                pendingUserRepository.findByEmail(registrationData.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body("Error: Email is already registered!");
        }

        // Create a pending user instead of a real user
        PendingUser pendingUser = new PendingUser();
        pendingUser.setUsername(registrationData.getUsername());
        pendingUser.setEmail(registrationData.getEmail());
        pendingUser.setPassword(passwordEncoder.encode(registrationData.getPassword()));
        pendingUser.setRole(registrationData.getRole() != null ? registrationData.getRole() : "BUYER");
        pendingUser.setVerificationToken(UUID.randomUUID().toString());

        pendingUserRepository.save(pendingUser);

        try {
            emailService.sendVerificationEmail(pendingUser.getEmail(), pendingUser.getVerificationToken());
        } catch (Exception e) {
            e.printStackTrace();
            // Optionally delete the pending user if email fails
            pendingUserRepository.delete(pendingUser);
            return ResponseEntity.status(500).body("Error: Failed to send verification email.");
        }

        return ResponseEntity.ok("User registered successfully! Please check your email to verify your account.");
    }

    @PostMapping("/verify-email")
    @Transactional
    public ResponseEntity<?> verifyEmail(@RequestBody Map<String, String> request) {
        String token = request.get("token");

        Optional<PendingUser> pendingOpt = pendingUserRepository.findByVerificationToken(token);

        if (pendingOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Error: Invalid verification link."));
        }

        PendingUser pendingUser = pendingOpt.get();

        if (pendingUser.isExpired()) {
            pendingUserRepository.delete(pendingUser);
            return ResponseEntity.badRequest().body(Map.of("message", "Error: Verification link has expired. Please register again."));
        }

        // Create the actual user now
        User user = new User();
        user.setUsername(pendingUser.getUsername());
        user.setEmail(pendingUser.getEmail());
        user.setPassword(pendingUser.getPassword()); // Already encrypted
        user.setRole(pendingUser.getRole());
        user.setEmailVerified(true);

        userRepository.save(user);

        // Delete the pending user
        pendingUserRepository.delete(pendingUser);

        return ResponseEntity.ok(Map.of("message", "Email verified successfully! You can now log in."));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> request) {

        String email = request.get("email");

        userRepository.findByEmail(email).ifPresent(user -> {

            PasswordReset reset = passwordRepository.findByUser(user)
                    .map(existing -> {
                        existing.setToken(UUID.randomUUID().toString());
                        existing.setExpiryDate(LocalDateTime.now().plusHours(1));
                        return existing;
                    })
                    .orElseGet(() -> new PasswordReset(UUID.randomUUID().toString(), user));

            passwordRepository.save(reset);

            try {
                emailService.sendResetEmail(user.getEmail(), reset.getToken());
            } catch (Exception e) {
                e.printStackTrace();
            }
        });

        return ResponseEntity.ok("If the email exists, a reset link has been sent.");
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> request) {
        String token = request.get("token");
        String newPassword = request.get("newPassword");

        Optional<PasswordReset> tokenOpt = passwordRepository.findByToken(token);

        if (tokenOpt.isPresent() && tokenOpt.get().getExpiryDate().isAfter(LocalDateTime.now())) {
            User user = tokenOpt.get().getUser();
            user.setPassword(passwordEncoder.encode(newPassword));
            userRepository.save(user);
            passwordRepository.delete(tokenOpt.get());
            return ResponseEntity.ok("Password updated successfully!");
        }
        return ResponseEntity.badRequest().body("Error: Invalid or expired reset token.");
    }
}