package com.econcierge.repository;

import com.econcierge.model.RequestItem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RequestItemRepository extends JpaRepository<RequestItem, Long> {
    List<RequestItem> findByCategoryIdAndEnabledTrueOrderBySortOrder(Long categoryId);
    List<RequestItem> findByCategoryIdOrderBySortOrder(Long categoryId);
    boolean existsByCategoryIdAndName(Long categoryId, String name);
}
