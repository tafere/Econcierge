package com.econcierge.repository;

import com.econcierge.model.ServiceRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ServiceRequestRepository extends JpaRepository<ServiceRequest, Long> {
    List<ServiceRequest> findByHotelIdOrderByCreatedAtDesc(Long hotelId);
    List<ServiceRequest> findByHotelIdAndStatusOrderByCreatedAtDesc(Long hotelId, ServiceRequest.Status status);
    List<ServiceRequest> findByRoomIdOrderByCreatedAtDesc(Long roomId);
}
