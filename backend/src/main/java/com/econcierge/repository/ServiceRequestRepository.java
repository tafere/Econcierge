package com.econcierge.repository;

import com.econcierge.model.ServiceRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.List;

public interface ServiceRequestRepository extends JpaRepository<ServiceRequest, Long> {
    List<ServiceRequest> findByHotelIdOrderByCreatedAtDesc(Long hotelId);
    List<ServiceRequest> findByHotelIdAndStatusOrderByCreatedAtDesc(Long hotelId, ServiceRequest.Status status);
    List<ServiceRequest> findByRoomIdOrderByCreatedAtDesc(Long roomId);
    List<ServiceRequest> findByRoomIdAndCreatedAtAfterOrderByCreatedAtDesc(Long roomId, LocalDateTime since);
    List<ServiceRequest> findByRoomIdAndDeviceIdAndCreatedAtAfterOrderByCreatedAtDesc(Long roomId, String deviceId, LocalDateTime since);
    List<ServiceRequest> findByHotelIdAndCreatedAtAfter(Long hotelId, LocalDateTime since);
}
