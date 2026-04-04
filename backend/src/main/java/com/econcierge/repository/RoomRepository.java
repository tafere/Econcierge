package com.econcierge.repository;

import com.econcierge.model.Room;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface RoomRepository extends JpaRepository<Room, Long> {
    Optional<Room> findByQrToken(String qrToken);
    List<Room> findByHotelIdOrderByRoomNumber(Long hotelId);
    boolean existsByHotelIdAndRoomNumber(Long hotelId, String roomNumber);
}
