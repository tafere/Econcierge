package com.econcierge.controller;

import com.econcierge.model.*;
import com.econcierge.repository.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/super")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class SuperAdminController {

    private final HotelRepository hotelRepository;
    private final StaffRepository staffRepository;
    private final PasswordEncoder passwordEncoder;
    private final RequestCategoryRepository categoryRepository;
    private final RequestItemRepository itemRepository;

    public SuperAdminController(HotelRepository hotelRepository,
                                StaffRepository staffRepository,
                                PasswordEncoder passwordEncoder,
                                RequestCategoryRepository categoryRepository,
                                RequestItemRepository itemRepository) {
        this.hotelRepository = hotelRepository;
        this.staffRepository = staffRepository;
        this.passwordEncoder = passwordEncoder;
        this.categoryRepository = categoryRepository;
        this.itemRepository = itemRepository;
    }

    /** List all hotels with their admin info */
    @GetMapping("/hotels")
    public ResponseEntity<?> listHotels() {
        List<Map<String, Object>> result = hotelRepository.findAll().stream().map(h -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id",           h.getId());
            m.put("name",         h.getName());
            m.put("slug",         h.getSlug());
            m.put("tagline",      h.getTagline());
            m.put("logoUrl",      h.getLogoUrl());
            m.put("primaryColor", h.getPrimaryColor());
            m.put("enabled",      h.isEnabled());
            m.put("createdAt",    h.getCreatedAt() != null ? h.getCreatedAt().toString() : null);
            // Find admin
            staffRepository.findByHotelId(h.getId()).stream()
                    .filter(s -> s.getRole() == Staff.Role.ADMIN)
                    .findFirst()
                    .ifPresent(admin -> {
                        m.put("adminUsername", admin.getUsername());
                        m.put("adminFullName", admin.getFullName());
                        m.put("adminId",       admin.getId());
                    });
            return m;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    /** Create a new hotel + admin user */
    @PostMapping("/hotels")
    public ResponseEntity<?> createHotel(@RequestBody Map<String, String> body) {
        String hotelName     = body.get("hotelName");
        String tagline       = body.get("tagline");
        String logoUrl       = body.get("logoUrl");
        String primaryColor  = body.get("primaryColor");
        String adminFullName = body.get("adminFullName");
        String adminUsername = body.get("adminUsername");
        String adminPassword = body.get("adminPassword");

        if (hotelName == null || hotelName.isBlank())
            return ResponseEntity.badRequest().body(Map.of("error", "Hotel name is required"));
        if (adminFullName == null || adminFullName.isBlank())
            return ResponseEntity.badRequest().body(Map.of("error", "Admin full name is required"));
        if (adminUsername == null || adminUsername.isBlank())
            return ResponseEntity.badRequest().body(Map.of("error", "Admin username is required"));
        if (adminPassword == null || adminPassword.length() < 6)
            return ResponseEntity.badRequest().body(Map.of("error", "Admin password must be at least 6 characters"));
        if (staffRepository.existsByUsername(adminUsername.trim().toLowerCase()))
            return ResponseEntity.badRequest().body(Map.of("error", "Username already taken"));

        // Generate unique slug
        String base = hotelName.trim().toLowerCase()
                .replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");
        String slug = base;
        int suffix = 2;
        while (hotelRepository.existsBySlug(slug)) slug = base + "-" + suffix++;

        Hotel hotel = new Hotel();
        hotel.setName(hotelName.trim());
        hotel.setSlug(slug);
        hotel.setTagline(tagline != null ? tagline.trim() : null);
        hotel.setLogoUrl(logoUrl != null && !logoUrl.isBlank() ? logoUrl.trim() : null);
        hotel.setPrimaryColor(primaryColor != null && primaryColor.matches("#[0-9a-fA-F]{6}") ? primaryColor : "#92400e");
        hotelRepository.save(hotel);

        Staff admin = new Staff();
        admin.setHotelId(hotel.getId());
        admin.setUsername(adminUsername.trim().toLowerCase());
        admin.setPassword(passwordEncoder.encode(adminPassword));
        admin.setFullName(adminFullName.trim());
        admin.setRole(Staff.Role.ADMIN);
        staffRepository.save(admin);

        // Seed default categories and items for this hotel
        seedDefaultCategories(hotel.getId());

        Map<String, Object> resp = new HashMap<>();
        resp.put("id",           hotel.getId());
        resp.put("name",         hotel.getName());
        resp.put("slug",         hotel.getSlug());
        resp.put("primaryColor", hotel.getPrimaryColor());
        resp.put("logoUrl",      hotel.getLogoUrl());
        resp.put("enabled",      hotel.isEnabled());
        resp.put("adminUsername", admin.getUsername());
        resp.put("adminFullName", admin.getFullName());
        return ResponseEntity.ok(resp);
    }

    /** Update hotel branding */
    @PatchMapping("/hotels/{id}")
    public ResponseEntity<?> updateHotel(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Hotel hotel = hotelRepository.findById(id).orElse(null);
        if (hotel == null) return ResponseEntity.notFound().build();

        if (body.containsKey("name") && !body.get("name").isBlank())
            hotel.setName(body.get("name").trim());
        if (body.containsKey("tagline"))
            hotel.setTagline(body.get("tagline") != null ? body.get("tagline").trim() : null);
        if (body.containsKey("logoUrl"))
            hotel.setLogoUrl(body.get("logoUrl") != null && !body.get("logoUrl").isBlank() ? body.get("logoUrl").trim() : null);
        if (body.containsKey("primaryColor") && body.get("primaryColor") != null
                && body.get("primaryColor").matches("#[0-9a-fA-F]{6}"))
            hotel.setPrimaryColor(body.get("primaryColor"));

        hotelRepository.save(hotel);

        Map<String, Object> resp = new HashMap<>();
        resp.put("id",           hotel.getId());
        resp.put("name",         hotel.getName());
        resp.put("tagline",      hotel.getTagline());
        resp.put("logoUrl",      hotel.getLogoUrl());
        resp.put("primaryColor", hotel.getPrimaryColor());
        return ResponseEntity.ok(resp);
    }

    /** Reset admin password */
    @PatchMapping("/hotels/{id}/admin-password")
    public ResponseEntity<?> resetAdminPassword(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Hotel hotel = hotelRepository.findById(id).orElse(null);
        if (hotel == null) return ResponseEntity.notFound().build();

        String newPassword = body.get("password");
        if (newPassword == null || newPassword.length() < 6)
            return ResponseEntity.badRequest().body(Map.of("error", "Password must be at least 6 characters"));

        staffRepository.findByHotelId(id).stream()
                .filter(s -> s.getRole() == Staff.Role.ADMIN)
                .findFirst()
                .ifPresent(admin -> {
                    admin.setPassword(passwordEncoder.encode(newPassword));
                    staffRepository.save(admin);
                });

        return ResponseEntity.ok(Map.of("updated", true));
    }

    /** Seed default categories for an existing hotel (idempotent) */
    @PostMapping("/hotels/{id}/seed-categories")
    public ResponseEntity<?> seedCategories(@PathVariable Long id) {
        if (!hotelRepository.existsById(id)) return ResponseEntity.notFound().build();
        seedDefaultCategories(id);
        return ResponseEntity.ok(Map.of("seeded", true));
    }

    /** Toggle hotel enabled/disabled */
    @PatchMapping("/hotels/{id}/toggle")
    public ResponseEntity<?> toggleHotel(@PathVariable Long id) {
        Hotel hotel = hotelRepository.findById(id).orElse(null);
        if (hotel == null) return ResponseEntity.notFound().build();
        hotel.setEnabled(!hotel.isEnabled());
        hotelRepository.save(hotel);
        return ResponseEntity.ok(Map.of("id", hotel.getId(), "enabled", hotel.isEnabled()));
    }

    private void seedDefaultCategories(Long hotelId) {
        seedCat(hotelId, "Housekeeping", "broom", 1, new String[][]{
            {"Room Cleaning","1"}, {"Turn-Down Service","1"}, {"Make Up Room","1"}
        });
        seedCat(hotelId, "Amenities", "sparkles", 2, new String[][]{
            {"Extra Towels","3"}, {"Extra Pillows","3"}, {"Extra Blanket","2"},
            {"Bathrobe","2"}, {"Extra Hangers","5"}
        });
        seedCat(hotelId, "Toiletries", "soap", 3, new String[][]{
            {"Toothbrush","2"}, {"Toothpaste","2"}, {"Shampoo","2"}, {"Conditioner","2"},
            {"Body Lotion","2"}, {"Razor","2"}, {"Shower Cap","2"}, {"Cotton Swabs","2"}
        });
        seedCat(hotelId, "Food & Beverage", "utensils", 4, new String[][]{
            {"Room Service Menu","1"}, {"Extra Water Bottles","4"},
            {"Coffee / Tea","4"}, {"Ice Bucket","1"}, {"Minibar Restock","1"}
        });
        seedCat(hotelId, "Maintenance", "wrench", 5, new String[][]{
            {"AC / Heating Issue","1"}, {"TV Not Working","1"}, {"Plumbing Issue","1"},
            {"Lighting Issue","1"}, {"Safe / Lock Issue","1"}
        });
        seedCat(hotelId, "Concierge", "concierge-bell", 6, new String[][]{
            {"Taxi / Transport","1"}, {"Tour Information","1"}, {"Wake-Up Call","1"},
            {"Luggage Assistance","1"}, {"Airport Shuttle","1"}
        });
    }

    private void seedCat(Long hotelId, String name, String icon, int order, String[][] items) {
        RequestCategory cat = categoryRepository.findByHotelIdAndName(hotelId, name).orElseGet(() -> {
            RequestCategory c = new RequestCategory();
            c.setHotelId(hotelId);
            c.setName(name);
            c.setIcon(icon);
            c.setSortOrder(order);
            return categoryRepository.save(c);
        });
        for (int i = 0; i < items.length; i++) {
            if (!itemRepository.existsByCategoryIdAndName(cat.getId(), items[i][0])) {
                RequestItem item = new RequestItem();
                item.setCategoryId(cat.getId());
                item.setName(items[i][0]);
                item.setSortOrder(i);
                item.setMaxQuantity(Integer.parseInt(items[i][1]));
                itemRepository.save(item);
            }
        }
    }
}
