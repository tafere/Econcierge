package com.econcierge.controller;

import com.econcierge.model.Hotel;
import com.econcierge.model.Staff;
import com.econcierge.repository.HotelRepository;
import com.econcierge.repository.StaffRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/setup")
public class SetupController {

    private final HotelRepository hotelRepository;
    private final StaffRepository staffRepository;
    private final PasswordEncoder passwordEncoder;

    public SetupController(HotelRepository hotelRepository,
                           StaffRepository staffRepository,
                           PasswordEncoder passwordEncoder) {
        this.hotelRepository = hotelRepository;
        this.staffRepository = staffRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> body) {
        String hotelName  = body.get("hotelName");
        String fullName   = body.get("fullName");
        String username   = body.get("username");
        String password   = body.get("password");

        if (hotelName == null || hotelName.isBlank())
            return ResponseEntity.badRequest().body(Map.of("error", "Hotel name is required"));
        if (fullName == null || fullName.isBlank())
            return ResponseEntity.badRequest().body(Map.of("error", "Your full name is required"));
        if (username == null || username.isBlank())
            return ResponseEntity.badRequest().body(Map.of("error", "Username is required"));
        if (password == null || password.length() < 6)
            return ResponseEntity.badRequest().body(Map.of("error", "Password must be at least 6 characters"));
        if (staffRepository.existsByUsername(username.trim().toLowerCase()))
            return ResponseEntity.badRequest().body(Map.of("error", "Username already taken"));

        // Generate a unique slug from hotel name
        String base = hotelName.trim().toLowerCase()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-|-$", "");
        String slug = base;
        int suffix = 2;
        while (hotelRepository.existsBySlug(slug)) {
            slug = base + "-" + suffix++;
        }

        Hotel hotel = new Hotel();
        hotel.setName(hotelName.trim());
        hotel.setSlug(slug);
        hotelRepository.save(hotel);

        Staff admin = new Staff();
        admin.setHotelId(hotel.getId());
        admin.setUsername(username.trim().toLowerCase());
        admin.setPassword(passwordEncoder.encode(password));
        admin.setFullName(fullName.trim());
        admin.setRole(Staff.Role.ADMIN);
        staffRepository.save(admin);

        return ResponseEntity.ok(Map.of(
                "hotelName", hotel.getName(),
                "username",  admin.getUsername()
        ));
    }
}
