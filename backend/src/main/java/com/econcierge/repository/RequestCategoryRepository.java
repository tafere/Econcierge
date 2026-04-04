package com.econcierge.repository;

import com.econcierge.model.RequestCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RequestCategoryRepository extends JpaRepository<RequestCategory, Long> {
    List<RequestCategory> findByHotelIdOrderBySortOrder(Long hotelId);
}
