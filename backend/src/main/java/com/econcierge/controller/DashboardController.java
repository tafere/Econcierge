package com.econcierge.controller;

import com.econcierge.config.JwtUtil;
import com.econcierge.model.*;
import com.econcierge.repository.*;
import java.util.HashMap;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final ServiceRequestRepository requestRepository;
    private final RoomRepository roomRepository;
    private final RequestItemRepository itemRepository;
    private final RequestCategoryRepository categoryRepository;
    private final StaffRepository staffRepository;
    private final HotelRepository hotelRepository;
    private final JwtUtil jwtUtil;

    public DashboardController(ServiceRequestRepository requestRepository,
                               RoomRepository roomRepository,
                               RequestItemRepository itemRepository,
                               RequestCategoryRepository categoryRepository,
                               StaffRepository staffRepository,
                               HotelRepository hotelRepository,
                               JwtUtil jwtUtil) {
        this.requestRepository = requestRepository;
        this.roomRepository = roomRepository;
        this.itemRepository = itemRepository;
        this.categoryRepository = categoryRepository;
        this.staffRepository = staffRepository;
        this.hotelRepository = hotelRepository;
        this.jwtUtil = jwtUtil;
    }

    @GetMapping("/requests")
    @PreAuthorize("hasAnyRole('STAFF','ADMIN','HOUSEKEEPING','MAINTENANCE','TRANSPORT','RESTAURANT','CAFE_BAR','SPA','GYM','MEETING_CONFERENCE')")
    public ResponseEntity<?> getRequests(@RequestHeader("Authorization") String header) {
        Long hotelId = jwtUtil.extractHotelId(header.substring(7));
        String role   = jwtUtil.extractRole(header.substring(7));

        List<ServiceRequest> requests = requestRepository.findByHotelIdOrderByCreatedAtDesc(hotelId);

        return ResponseEntity.ok(requests.stream()
                .filter(r -> matchesRole(r, role))
                .map(r -> toMap(r, hotelId)).toList());
    }

    @PatchMapping("/requests/{id}/status")
    @PreAuthorize("hasAnyRole('STAFF','ADMIN','HOUSEKEEPING','MAINTENANCE','TRANSPORT','RESTAURANT','CAFE_BAR','SPA','GYM','MEETING_CONFERENCE')")
    public ResponseEntity<?> updateStatus(@PathVariable Long id,
                                          @RequestBody Map<String, String> body,
                                          @RequestHeader("Authorization") String header) {
        Long hotelId  = jwtUtil.extractHotelId(header.substring(7));
        String username = jwtUtil.extractUsername(header.substring(7));

        ServiceRequest req = requestRepository.findById(id).orElse(null);
        if (req == null || !req.getHotelId().equals(hotelId))
            return ResponseEntity.notFound().build();

        ServiceRequest.Status newStatus = ServiceRequest.Status.valueOf(body.get("status"));
        req.setStatus(newStatus);

        if (newStatus == ServiceRequest.Status.IN_PROGRESS) {
            staffRepository.findByUsername(username).ifPresent(s -> req.setAssignedTo(s.getId()));
            req.setAcceptedAt(LocalDateTime.now());
        }
        if (newStatus == ServiceRequest.Status.DONE) {
            req.setCompletedAt(LocalDateTime.now());
        }
        if (newStatus == ServiceRequest.Status.DECLINED) {
            staffRepository.findByUsername(username).ifPresent(s -> req.setAssignedTo(s.getId()));
            if (body.containsKey("comment")) req.setStaffComment(body.get("comment"));
        }

        requestRepository.save(req);
        return ResponseEntity.ok(toMap(req, hotelId));
    }

    @GetMapping("/rooms")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public ResponseEntity<?> getRooms(@RequestHeader("Authorization") String header) {
        Long hotelId = jwtUtil.extractHotelId(header.substring(7));
        return ResponseEntity.ok(
            roomRepository.findByHotelIdOrderByRoomNumber(hotelId).stream().map(r -> Map.of(
                "id",         r.getId(),
                "roomNumber", r.getRoomNumber(),
                "floor",      r.getFloor() != null ? r.getFloor() : "",
                "roomType",   r.getRoomType() != null ? r.getRoomType() : "",
                "qrToken",    r.getQrToken(),
                "enabled",    r.isEnabled()
            )).toList()
        );
    }

    @PostMapping("/rooms")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> addRoom(@RequestBody Map<String, String> body,
                                     @RequestHeader("Authorization") String header) {
        Long hotelId = jwtUtil.extractHotelId(header.substring(7));
        String roomNumber = body.get("roomNumber");
        if (roomNumber == null || roomNumber.isBlank())
            return ResponseEntity.badRequest().body(Map.of("error", "Room number required"));
        if (roomRepository.existsByHotelIdAndRoomNumber(hotelId, roomNumber))
            return ResponseEntity.badRequest().body(Map.of("error", "Room number already exists"));

        Room room = new Room();
        room.setHotelId(hotelId);
        room.setRoomNumber(roomNumber);
        room.setFloor(body.get("floor"));
        room.setRoomType(body.get("roomType"));
        room.setQrToken(java.util.UUID.randomUUID().toString());
        roomRepository.save(room);

        return ResponseEntity.ok(Map.of(
                "id",         room.getId(),
                "roomNumber", room.getRoomNumber(),
                "qrToken",    room.getQrToken()
        ));
    }

    @GetMapping("/hotel")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public ResponseEntity<?> getHotel(@RequestHeader("Authorization") String header) {
        Long hotelId = jwtUtil.extractHotelId(header.substring(7));
        Hotel hotel = hotelRepository.findById(hotelId).orElse(null);
        if (hotel == null) return ResponseEntity.notFound().build();
        Map<String, Object> res = new HashMap<>();
        res.put("id",      hotel.getId());
        res.put("name",    hotel.getName());
        res.put("tagline", hotel.getTagline()  != null ? hotel.getTagline()  : "");
        res.put("logoUrl", hotel.getLogoUrl()  != null ? hotel.getLogoUrl()  : "");
        res.put("website", hotel.getWebsite()  != null ? hotel.getWebsite()  : "");
        res.put("address", hotel.getAddress()  != null ? hotel.getAddress()  : "");
        res.put("phone",   hotel.getPhone()    != null ? hotel.getPhone()    : "");
        res.put("email",   hotel.getEmail()    != null ? hotel.getEmail()    : "");
        return ResponseEntity.ok(res);
    }

    @PutMapping("/hotel")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateHotel(@RequestHeader("Authorization") String header,
                                         @RequestBody Map<String, String> body) {
        Long hotelId = jwtUtil.extractHotelId(header.substring(7));
        Hotel hotel = hotelRepository.findById(hotelId).orElse(null);
        if (hotel == null) return ResponseEntity.notFound().build();
        if (body.containsKey("name")    && !body.get("name").isBlank())  hotel.setName(body.get("name"));
        if (body.containsKey("tagline")) hotel.setTagline(body.get("tagline"));
        if (body.containsKey("logoUrl")) hotel.setLogoUrl(body.get("logoUrl"));
        if (body.containsKey("website")) hotel.setWebsite(body.get("website"));
        if (body.containsKey("address")) hotel.setAddress(body.get("address"));
        if (body.containsKey("phone"))   hotel.setPhone(body.get("phone"));
        if (body.containsKey("email"))   hotel.setEmail(body.get("email"));
        hotelRepository.save(hotel);
        return ResponseEntity.ok(Map.of("message", "Hotel settings updated"));
    }

    @GetMapping("/analytics")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAnalytics(@RequestHeader("Authorization") String header) {
        Long hotelId = jwtUtil.extractHotelId(header.substring(7));

        LocalDateTime now      = LocalDateTime.now();
        LocalDateTime today    = now.toLocalDate().atStartOfDay();
        LocalDateTime week     = now.minusDays(7);
        LocalDateTime month    = now.minusDays(30);

        List<ServiceRequest> all30 = requestRepository.findByHotelIdAndCreatedAtAfter(hotelId, month);
        List<ServiceRequest> all7  = all30.stream().filter(r -> r.getCreatedAt().isAfter(week)).toList();
        List<ServiceRequest> today_ = all30.stream().filter(r -> r.getCreatedAt().isAfter(today)).toList();

        // ── KPI ──────────────────────────────────────────────────────────────
        long openCount = all30.stream()
                .filter(r -> r.getStatus() == ServiceRequest.Status.PENDING
                          || r.getStatus() == ServiceRequest.Status.IN_PROGRESS)
                .count();

        long doneCount = all7.stream().filter(r -> r.getStatus() == ServiceRequest.Status.DONE).count();
        long closedCount = all7.stream().filter(r ->
                r.getStatus() == ServiceRequest.Status.DONE ||
                r.getStatus() == ServiceRequest.Status.DECLINED ||
                r.getStatus() == ServiceRequest.Status.CANCELLED).count();
        long completionRate = closedCount == 0 ? 0 : Math.round(doneCount * 100.0 / closedCount);

        OptionalDouble avgResponse = all7.stream()
                .filter(r -> r.getAcceptedAt() != null)
                .mapToLong(r -> java.time.Duration.between(r.getCreatedAt(), r.getAcceptedAt()).toMinutes())
                .average();

        Map<String, Object> kpi = new HashMap<>();
        kpi.put("todayCount",    today_.size());
        kpi.put("openCount",     openCount);
        kpi.put("completionRate", completionRate);
        kpi.put("avgResponseMins", avgResponse.isPresent() ? Math.round(avgResponse.getAsDouble()) : 0);

        // ── By Category (last 7 days) ─────────────────────────────────────
        Map<String, Long> catCounts = new LinkedHashMap<>();
        for (ServiceRequest r : all7) {
            RequestItem item = itemRepository.findById(r.getItemId()).orElse(null);
            if (item == null) continue;
            RequestCategory cat = categoryRepository.findById(item.getCategoryId()).orElse(null);
            if (cat == null) continue;
            catCounts.merge(cat.getName(), 1L, Long::sum);
        }
        List<Map<String, Object>> byCategory = catCounts.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .map(e -> { Map<String, Object> m = new HashMap<>(); m.put("category", e.getKey()); m.put("count", e.getValue()); return m; })
                .collect(Collectors.toList());

        // ── By Hour (today) ───────────────────────────────────────────────
        Map<Integer, Long> hourCounts = new TreeMap<>();
        for (int h = 0; h < 24; h++) hourCounts.put(h, 0L);
        for (ServiceRequest r : today_) hourCounts.merge(r.getCreatedAt().getHour(), 1L, Long::sum);
        List<Map<String, Object>> byHour = hourCounts.entrySet().stream()
                .map(e -> { Map<String, Object> m = new HashMap<>();
                    m.put("hour", String.format("%02d:00", e.getKey()));
                    m.put("count", e.getValue()); return m; })
                .collect(Collectors.toList());

        // ── By Day (last 7 days) ──────────────────────────────────────────
        DateTimeFormatter dayFmt = DateTimeFormatter.ofPattern("MMM d");
        Map<LocalDate, Long> dayCounts = new TreeMap<>();
        for (int i = 6; i >= 0; i--) dayCounts.put(now.toLocalDate().minusDays(i), 0L);
        for (ServiceRequest r : all7) dayCounts.merge(r.getCreatedAt().toLocalDate(), 1L, Long::sum);
        List<Map<String, Object>> byDay = dayCounts.entrySet().stream()
                .map(e -> { Map<String, Object> m = new HashMap<>();
                    m.put("date", e.getKey().format(dayFmt));
                    m.put("count", e.getValue()); return m; })
                .collect(Collectors.toList());

        // ── Top Items (last 30 days) ──────────────────────────────────────
        Map<String, Long> itemCounts = new LinkedHashMap<>();
        for (ServiceRequest r : all30) {
            RequestItem item = itemRepository.findById(r.getItemId()).orElse(null);
            if (item == null) continue;
            itemCounts.merge(item.getName(), 1L, Long::sum);
        }
        List<Map<String, Object>> topItems = itemCounts.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(8)
                .map(e -> { Map<String, Object> m = new HashMap<>(); m.put("item", e.getKey()); m.put("count", e.getValue()); return m; })
                .collect(Collectors.toList());

        // ── Staff Leaderboard (last 30 days) ─────────────────────────────
        Map<Long, List<ServiceRequest>> byStaff = all30.stream()
                .filter(r -> r.getAssignedTo() != null && r.getStatus() == ServiceRequest.Status.DONE)
                .collect(Collectors.groupingBy(ServiceRequest::getAssignedTo));
        List<Map<String, Object>> leaderboard = byStaff.entrySet().stream()
                .map(e -> {
                    String name = staffRepository.findById(e.getKey()).map(Staff::getFullName).orElse("Unknown");
                    long handled = e.getValue().size();
                    OptionalDouble avg = e.getValue().stream()
                            .filter(r -> r.getAcceptedAt() != null && r.getCompletedAt() != null)
                            .mapToLong(r -> java.time.Duration.between(r.getAcceptedAt(), r.getCompletedAt()).toMinutes())
                            .average();
                    Map<String, Object> m = new HashMap<>();
                    m.put("name", name);
                    m.put("handled", handled);
                    m.put("avgMins", avg.isPresent() ? Math.round(avg.getAsDouble()) : 0);
                    return m;
                })
                .sorted(Comparator.comparingLong(m -> -((Long) m.get("handled"))))
                .collect(Collectors.toList());

        Map<String, Object> result = new HashMap<>();
        result.put("kpi",         kpi);
        result.put("byCategory",  byCategory);
        result.put("byHour",      byHour);
        result.put("byDay",       byDay);
        result.put("topItems",    topItems);
        result.put("leaderboard", leaderboard);
        return ResponseEntity.ok(result);
    }

    /** Returns true if the request's category is visible to this role. */
    private boolean matchesRole(ServiceRequest r, String role) {
        if ("ADMIN".equals(role) || "STAFF".equals(role)) return true;
        RequestItem item = itemRepository.findById(r.getItemId()).orElse(null);
        if (item == null) return false;
        RequestCategory cat = categoryRepository.findById(item.getCategoryId()).orElse(null);
        if (cat == null) return false;
        String name = cat.getName();
        return switch (role) {
            case "HOUSEKEEPING"       -> name.equals("Housekeeping") || name.equals("Amenities") || name.equals("Toiletries");
            case "MAINTENANCE"        -> name.equals("Maintenance");
            case "TRANSPORT"          -> name.equals("Transport") || name.equals("Concierge");
            case "RESTAURANT"         -> name.equals("Restaurant") || name.equals("Food & Beverage");
            case "CAFE_BAR"           -> name.equals("Cafe & Bar") || name.equals("Food & Beverage");
            case "SPA"                -> name.equals("Spa");
            case "GYM"                -> name.equals("Gym");
            case "MEETING_CONFERENCE" -> name.equals("Meeting & Conference");
            default -> true;
        };
    }

    private Map<String, Object> toMap(ServiceRequest r, Long hotelId) {
        Room room = roomRepository.findById(r.getRoomId()).orElse(null);
        RequestItem item = itemRepository.findById(r.getItemId()).orElse(null);
        RequestCategory cat = item != null
                ? categoryRepository.findById(item.getCategoryId()).orElse(null) : null;
        String assignedName = r.getAssignedTo() != null
                ? staffRepository.findById(r.getAssignedTo()).map(Staff::getFullName).orElse("") : "";

        Map<String, Object> m = new HashMap<>();
        m.put("id",           r.getId());
        m.put("roomNumber",   room != null ? room.getRoomNumber() : "");
        m.put("floor",        room != null && room.getFloor() != null ? room.getFloor() : "");
        m.put("itemName",     item != null ? item.getName()   : "");
        m.put("itemNameAm",   item != null && item.getNameAm() != null ? item.getNameAm() : "");
        m.put("categoryName",   cat != null ? cat.getName()  : "");
        m.put("categoryNameAm", cat != null && cat.getNameAm() != null ? cat.getNameAm() : "");
        m.put("categoryIcon",   cat != null && cat.getIcon()  != null ? cat.getIcon()  : "");
        m.put("quantity",     r.getQuantity());
        m.put("notes",        r.getNotes() != null ? r.getNotes() : "");
        m.put("staffComment", r.getStaffComment() != null ? r.getStaffComment() : "");
        m.put("status",       r.getStatus().name());
        m.put("assignedTo",   assignedName);
        m.put("createdAt",    r.getCreatedAt().toString() + "Z");
        m.put("updatedAt",    r.getUpdatedAt()   != null ? r.getUpdatedAt().toString()   + "Z" : "");
        m.put("acceptedAt",   r.getAcceptedAt()  != null ? r.getAcceptedAt().toString()  + "Z" : "");
        m.put("completedAt",  r.getCompletedAt() != null ? r.getCompletedAt().toString() + "Z" : "");
        return m;
    }
}
