package com.hotel.hotel_backend.config;

import com.hotel.hotel_backend.entity.User;
import com.hotel.hotel_backend.entity.UserStatus;
import com.hotel.hotel_backend.entity.UserType;
import com.hotel.hotel_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class AdminSeedInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminSeedInitializer.class);

    private final AdminSeedProperties adminSeedProperties;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!adminSeedProperties.enabled()) {
            return;
        }

        String email = normalizeEmail(adminSeedProperties.email());
        String password = adminSeedProperties.password();

        if (email.isBlank() || password == null || password.isBlank()) {
            throw new IllegalStateException("app.admin-seed.email and app.admin-seed.password must not be blank");
        }

        User user = userRepository.findByEmail(email).orElseGet(User::new);
        boolean created = user.getId() == null;
        boolean changed = created;

        if (created) {
            user.setEmail(email);
        }
        if (user.getUserType() != UserType.ADMIN) {
            user.setUserType(UserType.ADMIN);
            changed = true;
        }
        if (user.getStatus() != UserStatus.ACTIVE) {
            user.setStatus(UserStatus.ACTIVE);
            changed = true;
        }
        if (created || user.getPasswordHash() == null || !passwordEncoder.matches(password, user.getPasswordHash())) {
            user.setPasswordHash(passwordEncoder.encode(password));
            changed = true;
        }

        if (changed) {
            userRepository.save(user);
            log.info("{} admin account {}", created ? "Seeded" : "Updated", email);
        }
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }
}
