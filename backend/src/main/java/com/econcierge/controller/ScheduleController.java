package com.econcierge.controller;

import com.econcierge.model.*;
import com.econcierge.repository.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Public scheduling API — no auth required.
 * Guests use this to view available slots and create bookings.
 */
@RestController
@RequestMapping("/api/schedule")
public class ScheduleController {

    private static final LocalTime SLOT_START = LocalTime.of(6, 0);
    private static final LocalTime SLOT_END   = LocalTime.of(23, 0);

    private final RequestItemRepository itemRepository;
    private final BookingRepository bookingRepository;
    private final RoomRepository roomRepository;

    public ScheduleController(RequestItemRepository itemRepository,
                              BookingRepository bookingRepository,
                              RoomRepository roomRepository) {
        this.itemRepository = itemRepository;
        this.bookingRepository = bookingRepository;
        this.roomRepository = roomRepository;
    }

    /**
     * GET /api/schedule/{itemId}/slots?date=YYYY-MM-DD
     * Returns time slots with remaining capacity for a given day.
     */
    @GetMapping("/{itemId}/slots")
    public ResponseEntity<?> getSlots(@PathVariable Long itemId,
                                      @RequestParam String date) {
        RequestItem item = itemRepository.findById(itemId).orElse(null);
        if (item == null || !item.isSchedulable())
            return ResponseEntity.notFound().build();

        LocalDate day;
        try { day = LocalDate.parse(date); }
        catch (Exception e) { return ResponseEntity.badRequest().body(Map.of("error", "Invalid date")); }

        LocalDateTime dayStart = day.atTime(SLOT_START);
        LocalDateTime dayEnd   = day.atTime(SLOT_END);

        // Fetch existing bookings for this item on this day
        List<Booking> existing = bookingRepository.findByItemIdAndSlotTimeBetween(itemId, dayStart, dayEnd);

        // Build a map: slotTime -> total booked guest count (PENDING + CONFIRMED only)
        Map<LocalDateTime, Integer> booked = new HashMap<>();
        for (Booking b : existing) {
            if (b.getStatus() == Booking.Status.CANCELLED) continue;
            booked.merge(b.getSlotTime(), b.getGuestCount(), Integer::sum);
        }

        // Generate slots
        List<Map<String, Object>> slots = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime cursor = dayStart;
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("h:mm a");

        while (!cursor.isAfter(dayEnd)) {
            int bookedCount = booked.getOrDefault(cursor, 0);
            int remaining   = item.getCapacity() - bookedCount;
            boolean past    = cursor.isBefore(now);

            Map<String, Object> slot = new HashMap<>();
            slot.put("time",      cursor.toLocalTime().format(fmt));
            slot.put("dateTime",  cursor.toString());
            slot.put("capacity",  item.getCapacity());
            slot.put("remaining", Math.max(0, remaining));
            slot.put("available", !past && remaining > 0);
            slot.put("past",      past);
            slots.add(slot);

            cursor = cursor.plusMinutes(item.getSlotIntervalMins());
        }

        Map<String, Object> result = new HashMap<>();
        result.put("itemId",          item.getId());
        result.put("itemName",        item.getName());
        result.put("capacity",        item.getCapacity());
        result.put("slotIntervalMins",item.getSlotIntervalMins());
        result.put("slots",           slots);
        return ResponseEntity.ok(result);
    }

    /**
     * POST /api/schedule/book
     * Create a booking for a schedulable item.
     */
    @PostMapping("/book")
    public ResponseEntity<?> book(@RequestBody Map<String, Object> body) {
        Long roomId    = body.get("roomId")     != null ? Long.valueOf(body.get("roomId").toString())  : null;
        Long itemId    = body.get("itemId")     != null ? Long.valueOf(body.get("itemId").toString())  : null;
        String dtStr   = body.get("slotTime")   != null ? body.get("slotTime").toString() : null;
        int guestCount = body.get("guestCount") != null ? Integer.parseInt(body.get("guestCount").toString()) : 1;
        String notes   = body.get("notes")      != null ? body.get("notes").toString() : null;

        if (roomId == null || itemId == null || dtStr == null)
            return ResponseEntity.badRequest().body(Map.of("error", "roomId, itemId and slotTime are required"));

        Room room = roomRepository.findById(roomId).orElse(null);
        if (room == null || !room.isEnabled())
            return ResponseEntity.badRequest().body(Map.of("error", "Room not found"));

        RequestItem item = itemRepository.findById(itemId).orElse(null);
        if (item == null || !item.isSchedulable())
            return ResponseEntity.badRequest().body(Map.of("error", "Item is not schedulable"));

        LocalDateTime slotTime;
        try { slotTime = LocalDateTime.parse(dtStr); }
        catch (Exception e) { return ResponseEntity.badRequest().body(Map.of("error", "Invalid slotTime")); }

        if (slotTime.isBefore(LocalDateTime.now()))
            return ResponseEntity.badRequest().body(Map.of("error", "Cannot book a past slot"));

        // Check remaining capacity
        List<Booking> existing = bookingRepository.findByItemIdAndSlotTimeBetween(
                itemId, slotTime, slotTime.plusSeconds(1));
        int bookedCount = existing.stream()
                .filter(b -> b.getStatus() != Booking.Status.CANCELLED)
                .mapToInt(Booking::getGuestCount).sum();
        int remaining = item.getCapacity() - bookedCount;

        if (guestCount < 1 || guestCount > remaining)
            return ResponseEntity.badRequest().body(Map.of("error",
                    "Only " + remaining + " spot(s) remaining for this slot"));

        Booking booking = new Booking();
        booking.setHotelId(room.getHotelId());
        booking.setItemId(itemId);
        booking.setRoomId(roomId);
        booking.setSlotTime(slotTime);
        booking.setGuestCount(Math.max(1, guestCount));
        booking.setNotes(notes);
        bookingRepository.save(booking);

        return ResponseEntity.ok(Map.of(
                "id",         booking.getId(),
                "status",     booking.getStatus().name(),
                "slotTime",   booking.getSlotTime().toString(),
                "guestCount", booking.getGuestCount(),
                "message",    "Your booking is confirmed. See you at " + slotTime.toLocalTime().format(DateTimeFormatter.ofPattern("h:mm a")) + "!"
        ));
    }

    /**
     * GET /api/schedule/bookings/status?ids=1,2,3
     * Guest polls booking statuses.
     */
    @GetMapping("/bookings/status")
    public ResponseEntity<?> getBookingStatuses(@RequestParam String ids) {
        try {
            List<Long> idList = Arrays.stream(ids.split(","))
                    .map(String::trim).filter(s -> !s.isEmpty()).map(Long::valueOf).toList();
            List<Map<String, Object>> statuses = bookingRepository.findAllById(idList).stream()
                    .map(b -> {
                        Map<String, Object> m = new HashMap<>();
                        m.put("id",     b.getId());
                        m.put("status", b.getStatus().name());
                        return m;
                    }).toList();
            return ResponseEntity.ok(statuses);
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid ids"));
        }
    }
}
