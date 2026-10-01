package com.ps515.auctionbackend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    // Reset Password method
    public void sendResetEmail(String toEmail, String token) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setSubject("Password Reset Request");
        message.setText(
                "Click the link to reset your password:\n\n" +
                        "http://localhost:3000/reset-password?token=" + token +
                        "\n\nThis link expires in 1 hour."
        );
        mailSender.send(message);
    }

    // generic method to handle Ticket Resolutions and other notifications
    public void sendSimpleEmail(String toEmail, String subject, String body) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setSubject(subject);
        message.setText(body);

        // This sends the email using existing SMTP settings in application.properties
        mailSender.send(message);
    }

    //Email Verification method
    public void sendVerificationEmail(String toEmail, String token) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);

        message.setSubject("Action Required: Verify your AuctionPro account");

        // Professional, enterprise-grade body text
        message.setText(
                "Hello,\n\n" +
                        "Thank you for registering with AuctionPro. To complete your account setup " +
                        "and ensure platform security, please verify your email address by clicking the secure link below:\n\n" +
                        "http://localhost:3000/verify-email?token=" + token + "\n\n" +
                        "This verification link will expire in 24 hours.\n\n" +
                        "If you did not create an account with us, please safely ignore this email.\n\n" +
                        "Best regards,\n" +
                        "The AuctionPro Team"
        );

        mailSender.send(message);
    }
}