package com.ps515.auctionbackend.controller;

import com.ps515.auctionbackend.model.Ticket;
import com.ps515.auctionbackend.model.User;
import com.ps515.auctionbackend.repository.TicketRepository;
import com.ps515.auctionbackend.repository.UserRepository;
import com.ps515.auctionbackend.service.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@CrossOrigin(origins = "http://localhost:3000")
public class TicketController {

    @Autowired
    private TicketRepository ticketRepository;

    @Autowired
    private UserRepository userRepository; // To look up the seller's email

    @Autowired
    private EmailService emailService;

    // 1. Endpoint for Sellers to CREATE a ticket
    @PostMapping("/api/tickets")
    public ResponseEntity<Ticket> createTicket(@RequestBody Ticket ticket) {
        Ticket savedTicket = ticketRepository.save(ticket);
        return ResponseEntity.ok(savedTicket);
    }

    // 2. Endpoint for Admins to GET all tickets for the dashboard
    @GetMapping("/api/admin/tickets")
    public ResponseEntity<List<Ticket>> getAllTickets() {
        return ResponseEntity.ok(ticketRepository.findAll());
    }

    // 3. Updated: Endpoint for Admins to mark a ticket as RESOLVED and Auto-Email
    @PutMapping("/api/admin/tickets/{id}/resolve")
    public ResponseEntity<?> resolveTicket(@PathVariable Long id) {
        return ticketRepository.findById(id).map(ticket -> {
            // 1. Update Ticket Status
            ticket.setStatus("RESOLVED");
            ticketRepository.save(ticket);

            // 2. Lookup Seller Email using their username
            Optional<User> sellerOpt = userRepository.findByUsername(ticket.getSenderUsername());

            if (sellerOpt.isPresent()) {
                String sellerEmail = sellerOpt.get().getEmail();
                String subject = "Resolution: " + ticket.getSubject();
                String body = "Hi " + ticket.getSenderUsername() + ",\n\n" +
                        "Our admin team has reviewed your request. To maintain auction integrity, " +
                        "we have cancelled the listing in question.\n\n" +
                        "You are now free to create a new listing with the corrected details via your dashboard.\n\n" +
                        "Best regards,\nAuction Admin Team";

                // 3. Send the automated email
                try {
                    emailService.sendSimpleEmail(sellerEmail, subject, body);
                } catch (Exception e) {
                    // Log the error but don't fail the whole request
                    System.err.println("Failed to send resolution email: " + e.getMessage());
                }
            }

            return ResponseEntity.ok().body("Ticket marked as resolved and seller notified.");
        }).orElse(ResponseEntity.notFound().build());
    }
}