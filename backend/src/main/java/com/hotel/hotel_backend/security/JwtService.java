package com.hotel.hotel_backend.security;

import com.hotel.hotel_backend.entity.User;
import com.hotel.hotel_backend.entity.UserType;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Map;

@Service
public class JwtService {
    private final SecretKey key;
    private final long expSeconds;

    public JwtService(JwtProperties props) {
        if (props.secret() == null || props.secret().getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException("JWT secret must be at least 32 bytes");
        }

        this.key = Keys.hmacShaKeyFor(props.secret().getBytes(StandardCharsets.UTF_8));
        this.expSeconds = props.expSeconds();
    }

    public String generate(User user) {
        Instant now = Instant.now();
        Instant exp = now.plusSeconds(expSeconds);

        return Jwts.builder()
                .subject(String.valueOf(user.getId()))
                .claims(Map.of(
                        "email", user.getEmail(),
                        "role", user.getUserType().name(),
                        "ver", user.getTokenVersion()
                ))
                .issuedAt(Date.from(now))
                .expiration(Date.from(exp))
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }

    public AccessTokenClaims parse(String token) {
        Jws<Claims> jws = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token);

        Claims c = jws.getPayload();
        Long userId = Long.valueOf(c.getSubject());
        String email = c.get("email", String.class);
        UserType role = UserType.valueOf(c.get("role", String.class));
        Number tokenVersion = c.get("ver", Number.class);

        return new AccessTokenClaims(userId, email, role, tokenVersion.longValue());
    }

    public long getExpSeconds() {
        return expSeconds;
    }
}
