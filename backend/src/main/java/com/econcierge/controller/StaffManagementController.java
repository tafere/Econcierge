package com.econcierge.controller;

import com.econcierge.config.JwtUtil;
import com.econcierge.model.Staff;
import com.econcierge.repository.StaffRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard/staff-mgmt")
public class StaffManagementController {

    private final StaffRepository staffRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public StaffManagementController(StaffRepository staffRepository,
                                     PasswordEncoder passwordEncoder,
                                     JwtUtil jwtUtil) {
        this.staffRepository = staffRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> listStaff(@RequestHeader("Authorization") String header) {
        Long hotelId = jwtUtil.extractHotelId(header.substring(7));
        List<Map<String, Object>> result = staffRepository.findByHotelId(hotelId).stream()
                .map(s -> Map.<String, Object>of(
                        "id",        s.getId(),
                        "username",  s.getUsername(),
                        "fullName",  s.getFullName(),
                        "role",      s.getRole().name(),
                        "enabled",   s.isEnabled()
                )).toList();
        return ResponseEntity.ok(result);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createStaff(@RequestHeader("Authorization") String header,
                                          @RequestBody Map<String, String> body) {
        Long hotelId = jwtUtil.extractHotelId(header.substring(7));

        String username = body.get("username");
        String password = body.get("password");
        String fullName = body.get("fullName");
        String roleStr  = body.get("role");

        if (username == null || password == null || fullName == null || roleStr == null)
            return ResponseEntity.badRequest().body(Map.of("error", "All fields required"));
        if (password.length() < 6)
            return ResponseEntity.badRequest().body(Map.of("error", "Password must be at least 6 characters"));
        if (staffRepository.existsByUsername(username))
            return ResponseEntity.badRequest().body(Map.of("error", "Username already taken"));

        Staff.Role role;
        try { role = Staff.Role.valueOf(roleStr); } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid role"));
        }
        // ADMIN cannot create another ADMIN
        if (role == Staff.Role.ADMIN)
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Cannot create ADMIN users"));

        Staff s = new Staff();
        s.setHotelId(hotelId);
        s.setUsername(username.trim().toLowerCase());
        s.setPassword(passwordEncoder.encode(password));
        s.setFullName(fullName.trim());
        s.setRole(role);
        staffRepository.save(s);

        return ResponseEntity.ok(Map.of("id", s.getId(), "username", s.getUsername(),
                "fullName", s.getFullName(), "role", s.getRole().name(), "enabled", s.isEnabled()));
    }

    @PatchMapping("/{id}/toggle")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> toggleStaff(@PathVariable Long id,
                                          @RequestHeader("Authorization") String header) {
        Long hotelId = jwtUtil.extractHotelId(header.substring(7));
        Staff s = staffRepository.findById(id).orElse(null);
        if (s == null || !s.getHotelId().equals(hotelId))
            return ResponseEntity.notFound().build();
        if (s.getRole() == Staff.Role.ADMIN)
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Cannot disable ADMIN"));
        s.setEnabled(!s.isEnabled());
        staffRepository.save(s);
        return ResponseEntity.ok(Map.of("id", s.getId(), "enabled", s.isEnabled()));
    }

    @PatchMapping("/{id}/role")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> changeRole(@PathVariable Long id,
                                         @RequestHeader("Authorization") String header,
                                         @RequestBody Map<String, String> body) {
        Long hotelId = jwtUtil.extractHotelId(header.substring(7));
        Staff s = staffRepository.findById(id).orElse(null);
        if (s == null || !s.getHotelId().equals(hotelId))
            return ResponseEntity.notFound().build();
        if (s.getRole() == Staff.Role.ADMIN)
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Cannot change ADMIN role"));
        Staff.Role newRole;
        try { newRole = Staff.Role.valueOf(body.get("role")); } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid role"));
        }
        if (newRole == Staff.Role.ADMIN)
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Cannot assign ADMIN role"));
        s.setRole(newRole);
        staffRepository.save(s);
        return ResponseEntity.ok(Map.of("id", s.getId(), "role", s.getRole().name()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteStaff(@PathVariable Long id,
                                          @RequestHeader("Authorization") String header) {
        Long hotelId = jwtUtil.extractHotelId(header.substring(7));
        Staff s = staffRepository.findById(id).orElse(null);
        if (s == null || !s.getHotelId().equals(hotelId))
            return ResponseEntity.notFound().build();
        if (s.getRole() == Staff.Role.ADMIN)
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Cannot delete ADMIN"));
        staffRepository.delete(s);
        return ResponseEntity.ok(Map.of("deleted", true));
    }
}
