package com.econcierge.controller;

import com.econcierge.model.*;
import com.econcierge.repository.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
    private final SseController sseController;

    public GuestController(RoomRepository roomRepository,
                           RequestCategoryRepository categoryRepository,
                           RequestItemRepository itemRepository,
                           ServiceRequestRepository requestRepository,
                           SseController sseController) {
        this.roomRepository = roomRepository;
        this.categoryRepository = categoryRepository;
        this.itemRepository = itemRepository;
        this.requestRepository = requestRepository;
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
                    .map(item -> Map.<String, Object>of(
                            "id",          item.getId(),
                            "name",        item.getName(),
                            "description", item.getDescription() != null ? item.getDescription() : "",
                            "maxQuantity", item.getMaxQuantity()
                    )).toList();

            return Map.<String, Object>of(
                    "id",    cat.getId(),
                    "name",  cat.getName(),
                    "icon",  cat.getIcon() != null ? cat.getIcon() : "",
                    "items", items
            );
        }).toList();

        return ResponseEntity.ok(Map.of(
                "roomId",     room.getId(),
                "roomNumber", room.getRoomNumber(),
                "floor",      room.getFloor() != null ? room.getFloor() : "",
                "hotelId",    room.getHotelId(),
                "menu",       menu
        ));
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

        ServiceRequest req = new ServiceRequest();
        req.setHotelId(room.getHotelId());
        req.setRoomId(roomId);
        req.setItemId(itemId);
        req.setNotes(notes);
        req.setQuantity(Math.max(1, quantity));
        requestRepository.save(req);

        // Push to staff dashboard via SSE
        sseController.broadcast(room.getHotelId(), req.getId(), room.getRoomNumber(), itemId, req.getQuantity(), notes);

        return ResponseEntity.ok(Map.of(
                "id",     req.getId(),
                "status", req.getStatus().name(),
                "message", "Your request has been received. Our team will assist you shortly."
        ));
    }
}
