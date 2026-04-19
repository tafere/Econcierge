package com.econcierge.controller;

import com.econcierge.config.JwtUtil;
import com.econcierge.model.Staff;
import com.econcierge.repository.StaffRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

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
                .map(s -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("id",       s.getId());
                    m.put("username", s.getUsername());
                    m.put("fullName", s.getFullName());
                    m.put("roles",    s.getRoles().stream().map(Staff.Role::name).collect(Collectors.toList()));
                    m.put("enabled",  s.isEnabled());
                    return m;
                }).toList();
        return ResponseEntity.ok(result);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createStaff(@RequestHeader("Authorization") String header,
                                          @RequestBody Map<String, Object> body) {
        Long hotelId = jwtUtil.extractHotelId(header.substring(7));

        String username = (String) body.get("username");
        String password = (String) body.get("password");
        String fullName = (String) body.get("fullName");

        if (username == null || password == null || fullName == null)
            return ResponseEntity.badRequest().body(Map.of("error", "All fields required"));
        if (password.length() < 6)
            return ResponseEntity.badRequest().body(Map.of("error", "Password must be at least 6 characters"));
        if (staffRepository.existsByUsername(username))
            return ResponseEntity.badRequest().body(Map.of("error", "Username already taken"));

        // Accept either "roles" (List) or legacy "role" (String)
        List<String> roleStrings = extractRoleStrings(body);
        if (roleStrings.isEmpty())
            return ResponseEntity.badRequest().body(Map.of("error", "At least one role required"));

        Set<Staff.Role> roles = new HashSet<>();
        for (String rs : roleStrings) {
            try { roles.add(Staff.Role.valueOf(rs)); } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid role: " + rs));
            }
        }
        // ADMIN cannot create another ADMIN
        if (roles.contains(Staff.Role.ADMIN))
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Cannot create ADMIN users"));

        Staff s = new Staff();
        s.setHotelId(hotelId);
        s.setUsername(username.trim().toLowerCase());
        s.setPassword(passwordEncoder.encode(password));
        s.setFullName(fullName.trim());
        s.setRoles(roles);
        staffRepository.save(s);

        Map<String, Object> resp = new HashMap<>();
        resp.put("id",       s.getId());
        resp.put("username", s.getUsername());
        resp.put("fullName", s.getFullName());
        resp.put("roles",    s.getRoles().stream().map(Staff.Role::name).collect(Collectors.toList()));
        resp.put("enabled",  s.isEnabled());
        return ResponseEntity.ok(resp);
    }

    @PatchMapping("/{id}/toggle")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> toggleStaff(@PathVariable Long id,
                                          @RequestHeader("Authorization") String header) {
        Long hotelId = jwtUtil.extractHotelId(header.substring(7));
        Staff s = staffRepository.findById(id).orElse(null);
        if (s == null || !s.getHotelId().equals(hotelId))
            return ResponseEntity.notFound().build();
        if (s.isAdminOrAbove())
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Cannot disable ADMIN"));
        s.setEnabled(!s.isEnabled());
        staffRepository.save(s);
        return ResponseEntity.ok(Map.of("id", s.getId(), "enabled", s.isEnabled()));
    }

    @PatchMapping("/{id}/roles")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> changeRoles(@PathVariable Long id,
                                          @RequestHeader("Authorization") String header,
                                          @RequestBody Map<String, Object> body) {
        Long hotelId = jwtUtil.extractHotelId(header.substring(7));
        Staff s = staffRepository.findById(id).orElse(null);
        if (s == null || !s.getHotelId().equals(hotelId))
            return ResponseEntity.notFound().build();
        if (s.isAdminOrAbove())
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Cannot change ADMIN roles"));

        List<String> roleStrings = extractRoleStrings(body);
        if (roleStrings.isEmpty())
            return ResponseEntity.badRequest().body(Map.of("error", "At least one role required"));

        Set<Staff.Role> roles = new HashSet<>();
        for (String rs : roleStrings) {
            try { roles.add(Staff.Role.valueOf(rs)); } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid role: " + rs));
            }
        }
        if (roles.contains(Staff.Role.ADMIN))
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Cannot assign ADMIN role"));

        s.setRoles(roles);
        staffRepository.save(s);

        Map<String, Object> resp = new HashMap<>();
        resp.put("id",    s.getId());
        resp.put("roles", s.getRoles().stream().map(Staff.Role::name).collect(Collectors.toList()));
        return ResponseEntity.ok(resp);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteStaff(@PathVariable Long id,
                                          @RequestHeader("Authorization") String header) {
        Long hotelId = jwtUtil.extractHotelId(header.substring(7));
        Staff s = staffRepository.findById(id).orElse(null);
        if (s == null || !s.getHotelId().equals(hotelId))
            return ResponseEntity.notFound().build();
        if (s.isAdminOrAbove())
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Cannot delete ADMIN"));
        staffRepository.delete(s);
        return ResponseEntity.ok(Map.of("deleted", true));
    }

    @SuppressWarnings("unchecked")
    private List<String> extractRoleStrings(Map<String, Object> body) {
        Object rolesVal = body.get("roles");
        if (rolesVal instanceof List) return (List<String>) rolesVal;
        // legacy single-role support
        Object roleVal = body.get("role");
        if (roleVal instanceof String s && !s.isBlank()) return List.of(s);
        return List.of();
    }
}
