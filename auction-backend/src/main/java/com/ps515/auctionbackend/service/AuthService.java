package com.ps515.auctionbackend.service;

import com.ps515.auctionbackend.model.User;
import com.ps515.auctionbackend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import java.util.Optional;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;


    public boolean verifyLogin(String username, String password) {
        Optional<User> userOpt = userRepository.findByUsername(username);

        if (userOpt.isPresent()) {
            User user = userOpt.get();
            // Verify the entered password against the hashed password in the database
            return passwordEncoder.matches(password, user.getPassword());
        }
        return false;
    }



    public User getUserByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found with username: " + username));
    }

    public void saveUser(User user) {
        userRepository.save(user);
    }
}