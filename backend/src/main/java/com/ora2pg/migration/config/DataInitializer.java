package com.ora2pg.migration.config;

import com.ora2pg.migration.entity.User;
import com.ora2pg.migration.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private PasswordEncoder passwordEncoder;
    
    @Override
    public void run(String... args) throws Exception {
        // Check if test user already exists
        if (!userRepository.existsByEmail("test@gmail.com")) {
            User testUser = new User();
            testUser.setEmail("test@gmail.com");
            testUser.setPassword(passwordEncoder.encode("123456"));
            testUser.setName("Test User");
            testUser.setRole("admin");
            
            userRepository.save(testUser);
            System.out.println("Test user created: test@gmail.com / 123456");
        } else {
            System.out.println("Test user already exists: test@gmail.com");
        }
    }
}

