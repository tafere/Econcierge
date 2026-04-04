package com.econcierge.repository;

import com.econcierge.model.Hotel;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface HotelRepository extends JpaRepository<Hotel, Long> {
    Optional<Hotel> findBySlug(String slug);
    boolean existsBySlug(String slug);
}
