package com.econcierge.controller;

import com.econcierge.config.JwtUtil;
import com.econcierge.model.*;
import com.econcierge.repository.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@RestController
@RequestMapping("/api/dashboard/bookings")
@PreAuthorize("hasAnyRole('ADMIN','STAFF')")
public class BookingController {

    private final BookingRepository bookingRepository;
    private final RequestItemRepository itemRepository;
    private final RoomRepository roomRepository;
    private final JwtUtil jwtUtil;

    public BookingController(BookingRepository bookingRepository,
                             RequestItemRepository itemRepository,
                             RoomRepository roomRepository,
                             JwtUtil jwtUtil) {
        this.bookingRepository = bookingRepository;
        this.itemRepository    = itemRepository;
        this.roomRepository    = roomRepository;
        this.jwtUtil           = jwtUtil;
    }

    /**
     * GET /api/dashboard/bookings?date=YYYY-MM-DD
     * List all bookings for the hotel on a given day (defaults to today).
     */
    @GetMapping
    public ResponseEntity<?> list(@RequestHeader("Authorization") String header,
                                  @RequestParam(required = false) String date) {
        Long hotelId = jwtUtil.extractHotelId(header.substring(7));

        LocalDate day = (date != null && !date.isBlank()) ? LocalDate.parse(date) : LocalDate.now();
        LocalDateTime start = day.atStartOfDay();
        LocalDateTime end   = day.plusDays(1).atStartOfDay();

        DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("HH:mm");
        DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("MMM d");

        List<Map<String, Object>> result = bookingRepository
                .findByHotelIdAndSlotTimeBetweenOrderBySlotTime(hotelId, start, end)
                .stream()
                .map(b -> {
                    RequestItem item = itemRepository.findById(b.getItemId()).orElse(null);
                    Room room = roomRepository.findById(b.getRoomId()).orElse(null);
                    Map<String, Object> m = new HashMap<>();
                    m.put("id",         b.getId());
                    m.put("status",     b.getStatus().name());
                    m.put("slotTime",   b.getSlotTime().toLocalTime().format(timeFmt));
                    m.put("slotDate",   b.getSlotTime().toLocalDate().format(dateFmt));
                    m.put("guestCount", b.getGuestCount());
                    m.put("notes",      b.getNotes() != null ? b.getNotes() : "");
                    m.put("itemName",   item != null ? item.getName() : "");
                    m.put("roomNumber", room != null ? room.getRoomNumber() : "");
                    m.put("floor",      room != null && room.getFloor() != null ? room.getFloor() : "");
                    return m;
                }).toList();

        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/dashboard/bookings/all
     * List all bookings for the hotel across a wide window (past 7 days → next 30 days).
     * Used by the dashboard to show bookings inline within Active/Completed/Cancelled tabs.
     */
    @GetMapping("/all")
    public ResponseEntity<?> listAll(@RequestHeader("Authorization") String header) {
        Long hotelId = jwtUtil.extractHotelId(header.substring(7));

        LocalDateTime from = LocalDateTime.now().minusDays(7);
        LocalDateTime to   = LocalDateTime.now().plusDays(30);

        DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("HH:mm");
        DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("MMM d");

        List<Map<String, Object>> result = bookingRepository
                .findByHotelIdAndSlotTimeBetweenOrderBySlotTime(hotelId, from, to)
                .stream()
                .map(b -> {
                    RequestItem item = itemRepository.findById(b.getItemId()).orElse(null);
                    Room room = roomRepository.findById(b.getRoomId()).orElse(null);
                    Map<String, Object> m = new HashMap<>();
                    m.put("id",          b.getId());
                    m.put("status",      b.getStatus().name());
                    m.put("slotTimeIso", b.getSlotTime().toString());
                    m.put("slotTime",    b.getSlotTime().toLocalTime().format(timeFmt));
                    m.put("slotDate",    b.getSlotTime().toLocalDate().format(dateFmt));
                    m.put("guestCount",  b.getGuestCount());
                    m.put("notes",       b.getNotes() != null ? b.getNotes() : "");
                    m.put("itemName",    item != null ? item.getName() : "");
                    m.put("roomNumber",  room != null ? room.getRoomNumber() : "");
                    m.put("floor",       room != null && room.getFloor() != null ? room.getFloor() : "");
                    return m;
                }).toList();

        return ResponseEntity.ok(result);
    }

    /**
     * PATCH /api/dashboard/bookings/{id}/status
     * Confirm or cancel a booking.
     */
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateStatus(@PathVariable Long id,
                                          @RequestHeader("Authorization") String header,
                                          @RequestBody Map<String, String> body) {
        Long hotelId = jwtUtil.extractHotelId(header.substring(7));
        Booking booking = bookingRepository.findById(id).orElse(null);
        if (booking == null || !booking.getHotelId().equals(hotelId))
            return ResponseEntity.notFound().build();

        try {
            booking.setStatus(Booking.Status.valueOf(body.get("status")));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid status"));
        }
        bookingRepository.save(booking);
        return ResponseEntity.ok(Map.of("id", booking.getId(), "status", booking.getStatus().name()));
    }
}
