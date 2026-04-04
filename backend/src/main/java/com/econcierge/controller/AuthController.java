package com.econcierge.controller;

import com.econcierge.config.JwtUtil;
import com.econcierge.model.Staff;
import com.econcierge.repository.HotelRepository;
import com.econcierge.repository.StaffRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final StaffRepository staffRepository;
    private final HotelRepository hotelRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthController(StaffRepository staffRepository, HotelRepository hotelRepository,
                          PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
        this.staffRepository = staffRepository;
        this.hotelRepository = hotelRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String password = body.get("password");
        if (username == null || password == null)
            return ResponseEntity.badRequest().body(Map.of("error", "Username and password required"));

        Staff staff = staffRepository.findByUsername(username).orElse(null);
        if (staff == null || !passwordEncoder.matches(password, staff.getPassword()))
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid credentials"));
        if (!staff.isEnabled())
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Account disabled"));

        String hotelName = hotelRepository.findById(staff.getHotelId())
                .map(h -> h.getName()).orElse("");

        String token = jwtUtil.generate(staff.getUsername(), staff.getRole().name(), staff.getHotelId());
        return ResponseEntity.ok(Map.of(
                "token",     token,
                "username",  staff.getUsername(),
                "fullName",  staff.getFullName(),
                "role",      staff.getRole().name(),
                "hotelId",   staff.getHotelId(),
                "hotelName", hotelName
        ));
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(Authentication auth, @RequestHeader("Authorization") String header) {
        String token = header.substring(7);
        if (!jwtUtil.isValid(token))
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid token"));

        Staff staff = staffRepository.findByUsername(jwtUtil.extractUsername(token)).orElse(null);
        if (staff == null || !staff.isEnabled())
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Not found"));

        String hotelName = hotelRepository.findById(staff.getHotelId())
                .map(h -> h.getName()).orElse("");

        return ResponseEntity.ok(Map.of(
                "username",  staff.getUsername(),
                "fullName",  staff.getFullName(),
                "role",      staff.getRole().name(),
                "hotelId",   staff.getHotelId(),
                "hotelName", hotelName
        ));
    }
}
