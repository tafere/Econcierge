package com.econcierge.repository;

import com.econcierge.model.RequestItemOption;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RequestItemOptionRepository extends JpaRepository<RequestItemOption, Long> {
    List<RequestItemOption> findByItemIdOrderBySortOrder(Long itemId);
    List<RequestItemOption> findByItemIdAndEnabledTrueOrderBySortOrder(Long itemId);
}
