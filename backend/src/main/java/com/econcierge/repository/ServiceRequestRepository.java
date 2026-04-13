package com.econcierge.repository;

import com.econcierge.model.ServiceRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;

public interface ServiceRequestRepository extends JpaRepository<ServiceRequest, Long> {
    List<ServiceRequest> findByHotelIdOrderByCreatedAtDesc(Long hotelId);
    List<ServiceRequest> findByHotelIdAndStatusOrderByCreatedAtDesc(Long hotelId, ServiceRequest.Status status);
    List<ServiceRequest> findByRoomIdOrderByCreatedAtDesc(Long roomId);
    List<ServiceRequest> findByRoomIdAndCreatedAtAfterOrderByCreatedAtDesc(Long roomId, LocalDateTime since);

    /** Returns requests for this device (or legacy requests with no device_id) within the time window */
    @Query("SELECT r FROM ServiceRequest r WHERE r.roomId = :roomId AND r.createdAt >= :since " +
           "AND (r.deviceId = :deviceId OR r.deviceId IS NULL) ORDER BY r.createdAt DESC")
    List<ServiceRequest> findByRoomForDevice(@Param("roomId") Long roomId,
                                             @Param("deviceId") String deviceId,
                                             @Param("since") LocalDateTime since);

    List<ServiceRequest> findByHotelIdAndCreatedAtAfter(Long hotelId, LocalDateTime since);
}
