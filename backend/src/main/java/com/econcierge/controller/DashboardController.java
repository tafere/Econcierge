package com.econcierge.controller;

import com.econcierge.config.JwtUtil;
import com.econcierge.model.*;
import com.econcierge.repository.*;
import java.util.HashMap;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

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
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN', 'HOUSEKEEPING', 'MAINTENANCE')")
    public ResponseEntity<?> getRequests(@RequestHeader("Authorization") String header,
                                         @RequestParam(required = false) String status) {
        Long hotelId = jwtUtil.extractHotelId(header.substring(7));
        String role   = jwtUtil.extractRole(header.substring(7));

        List<ServiceRequest> requests = status != null
                ? requestRepository.findByHotelIdAndStatusOrderByCreatedAtDesc(hotelId, ServiceRequest.Status.valueOf(status))
                : requestRepository.findByHotelIdOrderByCreatedAtDesc(hotelId);

        return ResponseEntity.ok(requests.stream()
                .filter(r -> matchesRole(r, role))
                .map(r -> toMap(r, hotelId)).toList());
    }

    @PatchMapping("/requests/{id}/status")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN', 'HOUSEKEEPING', 'MAINTENANCE')")
    public ResponseEntity<?> updateStatus(@PathVariable Long id,
                                          @RequestBody Map<String, String> body,
                                          @RequestHeader("Authorization") String header) {
        Long hotelId = jwtUtil.extractHotelId(header.substring(7));
        String username = jwtUtil.extractUsername(header.substring(7));

        ServiceRequest req = requestRepository.findById(id).orElse(null);
        if (req == null || !req.getHotelId().equals(hotelId))
            return ResponseEntity.notFound().build();

        ServiceRequest.Status newStatus = ServiceRequest.Status.valueOf(body.get("status"));
        req.setStatus(newStatus);

        if (newStatus == ServiceRequest.Status.IN_PROGRESS) {
            staffRepository.findByUsername(username).ifPresent(s -> req.setAssignedTo(s.getId()));
        }
        if (newStatus == ServiceRequest.Status.DONE) {
            req.setCompletedAt(LocalDateTime.now());
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

    /** Returns true if the request's category is visible to this role. */
    private boolean matchesRole(ServiceRequest r, String role) {
        if ("ADMIN".equals(role) || "STAFF".equals(role)) return true;
        RequestItem item = itemRepository.findById(r.getItemId()).orElse(null);
        if (item == null) return false;
        RequestCategory cat = categoryRepository.findById(item.getCategoryId()).orElse(null);
        if (cat == null) return false;
        String name = cat.getName();
        return switch (role) {
            case "HOUSEKEEPING" -> name.equals("Housekeeping") || name.equals("Amenities") || name.equals("Toiletries");
            case "MAINTENANCE"  -> name.equals("Maintenance");
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

        return Map.ofEntries(
            Map.entry("id",            r.getId()),
            Map.entry("roomNumber",    room != null ? room.getRoomNumber() : ""),
            Map.entry("floor",         room != null && room.getFloor() != null ? room.getFloor() : ""),
            Map.entry("itemName",      item != null ? item.getName() : ""),
            Map.entry("categoryName",  cat  != null ? cat.getName()  : ""),
            Map.entry("categoryIcon",  cat  != null && cat.getIcon() != null ? cat.getIcon() : ""),
            Map.entry("quantity",       r.getQuantity()),
            Map.entry("notes",         r.getNotes() != null ? r.getNotes() : ""),
            Map.entry("status",        r.getStatus().name()),
            Map.entry("assignedTo",    assignedName),
            Map.entry("createdAt",     r.getCreatedAt().toString() + "Z"),
            Map.entry("updatedAt",     r.getUpdatedAt() != null ? r.getUpdatedAt().toString() + "Z" : ""),
            Map.entry("completedAt",   r.getCompletedAt() != null ? r.getCompletedAt().toString() + "Z" : "")
        );
    }
}
