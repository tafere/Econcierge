package com.econcierge.repository;

import com.econcierge.model.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.List;

public interface BookingRepository extends JpaRepository<Booking, Long> {
    List<Booking> findByItemIdAndSlotTimeBetween(Long itemId, LocalDateTime start, LocalDateTime end);
    List<Booking> findByHotelIdAndSlotTimeBetweenOrderBySlotTime(Long hotelId, LocalDateTime start, LocalDateTime end);
}
