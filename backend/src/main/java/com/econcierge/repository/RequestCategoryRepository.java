package com.econcierge.repository;

import com.econcierge.model.RequestCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface RequestCategoryRepository extends JpaRepository<RequestCategory, Long> {
    List<RequestCategory> findByHotelIdOrderBySortOrder(Long hotelId);
    Optional<RequestCategory> findByHotelIdAndName(Long hotelId, String name);
}
