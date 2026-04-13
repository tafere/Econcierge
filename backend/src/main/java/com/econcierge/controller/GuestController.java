package com.econcierge.controller;

import com.econcierge.model.*;
import com.econcierge.repository.*;
import java.util.HashMap;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Public API — no authentication required.
 * Used by guests after scanning a room QR code.
 */
@RestController
@RequestMapping("/api/guest")
public class GuestController {

    private final RoomRepository roomRepository;
    private final RequestCategoryRepository categoryRepository;
    private final RequestItemRepository itemRepository;
    private final ServiceRequestRepository requestRepository;
    private final HotelRepository hotelRepository;
    private final SseController sseController;

    public GuestController(RoomRepository roomRepository,
                           RequestCategoryRepository categoryRepository,
                           RequestItemRepository itemRepository,
                           ServiceRequestRepository requestRepository,
                           HotelRepository hotelRepository,
                           SseController sseController) {
        this.roomRepository = roomRepository;
        this.categoryRepository = categoryRepository;
        this.itemRepository = itemRepository;
        this.requestRepository = requestRepository;
        this.hotelRepository = hotelRepository;
        this.sseController = sseController;
    }

    /** Resolve QR token → room info + menu */
    @GetMapping("/room/{token}")
    public ResponseEntity<?> getRoomMenu(@PathVariable String token) {
        Room room = roomRepository.findByQrToken(token).orElse(null);
        if (room == null || !room.isEnabled())
            return ResponseEntity.notFound().build();

        List<RequestCategory> categories = categoryRepository.findByHotelIdOrderBySortOrder(room.getHotelId());

        List<Map<String, Object>> menu = categories.stream().map(cat -> {
            List<Map<String, Object>> items = itemRepository
                    .findByCategoryIdAndEnabledTrueOrderBySortOrder(cat.getId())
                    .stream()
                    .map(item -> {
                        Map<String, Object> m = new HashMap<>();
                        m.put("id",               item.getId());
                        m.put("name",             item.getName());
                        m.put("nameAm",           item.getNameAm() != null ? item.getNameAm() : "");
                        m.put("description",      item.getDescription() != null ? item.getDescription() : "");
                        m.put("maxQuantity",      item.getMaxQuantity());
                        m.put("schedulable",      item.isSchedulable());
                        m.put("slotIntervalMins", item.getSlotIntervalMins());
                        m.put("capacity",         item.getCapacity());
                        return m;
                    }).toList();

            Map<String, Object> catMap = new HashMap<>();
            catMap.put("id",     cat.getId());
            catMap.put("name",   cat.getName());
            catMap.put("nameAm", cat.getNameAm() != null ? cat.getNameAm() : "");
            catMap.put("icon",   cat.getIcon() != null ? cat.getIcon() : "");
            catMap.put("items",  items);
            return catMap;
        }).toList();

        Hotel hotel = hotelRepository.findById(room.getHotelId()).orElse(null);

        Map<String, Object> response = new HashMap<>();
        response.put("roomId",     room.getId());
        response.put("roomNumber", room.getRoomNumber());
        response.put("floor",      room.getFloor() != null ? room.getFloor() : "");
        response.put("hotelId",    room.getHotelId());
        response.put("hotelName",    hotel != null ? hotel.getName() : "");
        response.put("tagline",      hotel != null && hotel.getTagline()     != null ? hotel.getTagline()     : "");
        response.put("logoUrl",      hotel != null && hotel.getLogoUrl()     != null ? hotel.getLogoUrl()     : "");
        response.put("primaryColor", hotel != null && hotel.getPrimaryColor() != null ? hotel.getPrimaryColor() : "#92400e");
        response.put("menu",         menu);
        return ResponseEntity.ok(response);
    }

    /** Batch-check request statuses (guest status tracker) */
    @GetMapping("/requests/status")
    public ResponseEntity<?> getRequestStatuses(@RequestParam String ids) {
        try {
            List<Long> idList = java.util.Arrays.stream(ids.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .map(Long::valueOf)
                    .toList();

            List<Map<String, Object>> statuses = requestRepository.findAllById(idList).stream()
                    .map(r -> {
                        Map<String, Object> m = new HashMap<>();
                        m.put("id",           r.getId());
                        m.put("status",       r.getStatus().name());
                        m.put("staffComment", r.getStaffComment() != null ? r.getStaffComment() : "");
                        return m;
                    }).toList();

            return ResponseEntity.ok(statuses);
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid ids"));
        }
    }

    /** Submit a service request */
    @PostMapping("/request")
    public ResponseEntity<?> submitRequest(@RequestBody Map<String, Object> body) {
        Long roomId   = body.get("roomId")   != null ? Long.valueOf(body.get("roomId").toString())   : null;
        Long itemId   = body.get("itemId")   != null ? Long.valueOf(body.get("itemId").toString())   : null;
        String notes  = body.get("notes")    != null ? body.get("notes").toString() : null;
        int quantity  = body.get("quantity") != null ? Integer.parseInt(body.get("quantity").toString()) : 1;

        if (roomId == null || itemId == null)
            return ResponseEntity.badRequest().body(Map.of("error", "roomId and itemId are required"));

        Room room = roomRepository.findById(roomId).orElse(null);
        if (room == null || !room.isEnabled())
            return ResponseEntity.badRequest().body(Map.of("error", "Room not found"));

        String deviceId = body.get("deviceId") != null ? body.get("deviceId").toString() : null;

        ServiceRequest req = new ServiceRequest();
        req.setHotelId(room.getHotelId());
        req.setRoomId(roomId);
        req.setItemId(itemId);
        req.setNotes(notes);
        req.setQuantity(Math.max(1, quantity));
        req.setDeviceId(deviceId);
        requestRepository.save(req);

        sseController.broadcast(room.getHotelId(), req.getId(), room.getRoomNumber(), itemId, req.getQuantity(), notes);

        return ResponseEntity.ok(Map.of(
                "id",      req.getId(),
                "status",  req.getStatus().name(),
                "message", "Your request has been received. Our team will assist you shortly."
        ));
    }

    /** Today's requests for this device — used to restore tracker after a fresh QR scan */
    @GetMapping("/room/{token}/requests")
    public ResponseEntity<?> getTodayRequests(@PathVariable String token,
                                              @RequestParam(required = false) String deviceId) {
        Room room = roomRepository.findByQrToken(token).orElse(null);
        if (room == null || !room.isEnabled()) return ResponseEntity.notFound().build();

        // 24-hour window — handles cross-midnight sessions and timezone offsets
        var since = LocalDateTime.now().minusHours(24);

        // If deviceId is provided: show this device's requests + legacy rows with no device_id
        // If no deviceId: show all room requests (guest cleared data / old session)
        List<Map<String, Object>> result = (deviceId != null && !deviceId.isBlank()
                ? requestRepository.findByRoomForDevice(room.getId(), deviceId, since)
                : requestRepository.findByRoomIdAndCreatedAtAfterOrderByCreatedAtDesc(room.getId(), since)
        )
                .stream()
                .map(r -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("id",           r.getId());
                    m.put("status",       r.getStatus().name());
                    m.put("quantity",     r.getQuantity());
                    m.put("notes",        r.getNotes() != null ? r.getNotes() : "");
                    m.put("staffComment", r.getStaffComment() != null ? r.getStaffComment() : "");
                    m.put("submittedAt",  r.getCreatedAt().toString());

                    var item = itemRepository.findById(r.getItemId()).orElse(null);
                    m.put("itemName",   item != null ? item.getName() : "");
                    m.put("itemNameAm", item != null && item.getNameAm() != null ? item.getNameAm() : "");

                    if (item != null) {
                        var cat = categoryRepository.findById(item.getCategoryId()).orElse(null);
                        m.put("categoryName", cat != null ? cat.getName() : "");
                        m.put("categoryIcon", cat != null && cat.getIcon() != null ? cat.getIcon() : "star");
                    } else {
                        m.put("categoryName", "");
                        m.put("categoryIcon", "star");
                    }
                    return m;
                }).toList();

        return ResponseEntity.ok(result);
    }

    /**
     * Cancel a pending request.
     * Ownership is verified by matching the QR token to the request's room.
     */
    @PostMapping("/request/{id}/cancel")
    public ResponseEntity<?> cancelRequest(@PathVariable Long id,
                                           @RequestBody Map<String, String> body) {
        String qrToken = body.get("qrToken");
        if (qrToken == null || qrToken.isBlank())
            return ResponseEntity.badRequest().body(Map.of("error", "qrToken required"));

        ServiceRequest req = requestRepository.findById(id).orElse(null);
        if (req == null) return ResponseEntity.notFound().build();

        Room room = roomRepository.findById(req.getRoomId()).orElse(null);
        if (room == null || !room.getQrToken().equals(qrToken))
            return ResponseEntity.status(403).body(Map.of("error", "Forbidden"));

        if (req.getStatus() != ServiceRequest.Status.PENDING)
            return ResponseEntity.badRequest().body(Map.of("error", "Only pending requests can be cancelled"));

        req.setStatus(ServiceRequest.Status.CANCELLED);
        requestRepository.save(req);
        return ResponseEntity.ok(Map.of("status", "CANCELLED"));
    }
}
