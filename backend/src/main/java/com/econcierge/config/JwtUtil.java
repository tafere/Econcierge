package com.econcierge.config;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.List;

@Component
public class JwtUtil {

    private final SecretKey key;
    private final long expirationMs;

    public JwtUtil(@Value("${jwt.secret}") String secret,
                   @Value("${jwt.expiration.ms}") long expirationMs) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    public String generate(String username, List<String> roles, Long hotelId) {
        return Jwts.builder()
                .subject(username)
                .claim("roles", roles)
                .claim("hotelId", hotelId)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(key)
                .compact();
    }

    public boolean isValid(String token) {
        try { getClaims(token); return true; } catch (JwtException | IllegalArgumentException e) { return false; }
    }

    public String extractUsername(String token) { return getClaims(token).getSubject(); }

    @SuppressWarnings("unchecked")
    public List<String> extractRoles(String token) {
        Object val = getClaims(token).get("roles");
        if (val instanceof List) return (List<String>) val;
        // backward compat: old tokens had a single "role" claim
        Object legacy = getClaims(token).get("role");
        if (legacy instanceof String) return List.of((String) legacy);
        return List.of();
    }

    public Long extractHotelId(String token) { return getClaims(token).get("hotelId", Long.class); }

    private Claims getClaims(String token) {
        return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
    }
}
