package com.ps515.auctionbackend.repository;

import com.ps515.auctionbackend.model.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TicketRepository extends JpaRepository<Ticket, Long> {
    List<Ticket> findBySenderUsername(String senderUsername);
}