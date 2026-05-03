package com.econcierge.controller;

import com.econcierge.config.JwtUtil;
import com.econcierge.model.RequestCategory;
import com.econcierge.model.RequestItem;
import com.econcierge.repository.RequestCategoryRepository;
import com.econcierge.repository.RequestItemRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/dashboard/categories")
@PreAuthorize("hasRole('ADMIN')")
public class CategoryController {

    private final RequestCategoryRepository categoryRepository;
    private final RequestItemRepository itemRepository;
    private final JwtUtil jwtUtil;

    public CategoryController(RequestCategoryRepository categoryRepository,
                              RequestItemRepository itemRepository,
                              JwtUtil jwtUtil) {
        this.categoryRepository = categoryRepository;
        this.itemRepository = itemRepository;
        this.jwtUtil = jwtUtil;
    }

    /** List all categories with their items */
    @GetMapping
    public ResponseEntity<?> list(@RequestHeader("Authorization") String header) {
        Long hotelId = jwtUtil.extractHotelId(header.substring(7));
        List<Map<String, Object>> result = categoryRepository
                .findByHotelIdOrderBySortOrder(hotelId)
                .stream()
                .map(cat -> {
                    List<Map<String, Object>> items = itemRepository
                            .findByCategoryIdOrderBySortOrder(cat.getId())
                            .stream()
                            .map(item -> {
                                Map<String, Object> m = new HashMap<>();
                                m.put("id",               item.getId());
                                m.put("name",             item.getName());
                                m.put("nameAm",           item.getNameAm());
                                m.put("enabled",          item.isEnabled());
                                m.put("maxQuantity",      item.getMaxQuantity());
                                m.put("schedulable",      item.isSchedulable());
                                m.put("slotIntervalMins", item.getSlotIntervalMins());
                                m.put("capacity",         item.getCapacity());
                                m.put("confirmOnly",      item.isConfirmOnly());
                                return m;
                            }).toList();
                    Map<String, Object> m = new HashMap<>();
                    m.put("id",         cat.getId());
                    m.put("name",       cat.getName());
                    m.put("nameAm",     cat.getNameAm() != null ? cat.getNameAm() : "");
                    m.put("icon",       cat.getIcon() != null ? cat.getIcon() : "");
                    m.put("sortOrder",  cat.getSortOrder());
                    m.put("etaMinutes", cat.getEtaMinutes());
                    m.put("enabled",    cat.isEnabled());
                    m.put("items",      items);
                    return m;
                }).toList();
        return ResponseEntity.ok(result);
    }

    /** Create a new category */
    @PostMapping
    public ResponseEntity<?> create(@RequestHeader("Authorization") String header,
                                    @RequestBody Map<String, Object> body) {
        Long hotelId = jwtUtil.extractHotelId(header.substring(7));
        String name = body.get("name") != null ? body.get("name").toString().trim() : "";
        if (name.isBlank()) return ResponseEntity.badRequest().body(Map.of("error", "Name is required"));
        String icon = body.get("icon") != null ? body.get("icon").toString() : "";

        int maxOrder = categoryRepository.findByHotelIdOrderBySortOrder(hotelId)
                .stream().mapToInt(RequestCategory::getSortOrder).max().orElse(0);

        RequestCategory cat = new RequestCategory();
        cat.setHotelId(hotelId);
        cat.setName(name);
        cat.setIcon(icon);
        cat.setSortOrder(maxOrder + 1);
        categoryRepository.save(cat);

        return ResponseEntity.ok(Map.of("id", cat.getId(), "name", cat.getName(),
                "icon", cat.getIcon(), "sortOrder", cat.getSortOrder(), "items", List.of()));
    }

    /** Update category name/icon/etaMinutes */
    @PatchMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id,
                                    @RequestHeader("Authorization") String header,
                                    @RequestBody Map<String, Object> body) {
        Long hotelId = jwtUtil.extractHotelId(header.substring(7));
        RequestCategory cat = categoryRepository.findById(id).orElse(null);
        if (cat == null || !cat.getHotelId().equals(hotelId)) return ResponseEntity.notFound().build();
        if (body.containsKey("name") && body.get("name") != null && !body.get("name").toString().isBlank())
            cat.setName(body.get("name").toString().trim());
        if (body.containsKey("icon") && body.get("icon") != null)
            cat.setIcon(body.get("icon").toString());
        if (body.containsKey("etaMinutes")) {
            if (body.get("etaMinutes") == null) {
                cat.setEtaMinutes(null);
            } else {
                try { cat.setEtaMinutes(Integer.parseInt(body.get("etaMinutes").toString())); }
                catch (NumberFormatException ignored) {}
            }
        }
        if (body.containsKey("enabled"))
            cat.setEnabled(Boolean.parseBoolean(body.get("enabled").toString()));
        categoryRepository.save(cat);
        Map<String, Object> resp = new HashMap<>();
        resp.put("id",         cat.getId());
        resp.put("name",       cat.getName());
        resp.put("icon",       cat.getIcon());
        resp.put("etaMinutes", cat.getEtaMinutes());
        return ResponseEntity.ok(resp);
    }

    /** Delete a category and all its items */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id,
                                    @RequestHeader("Authorization") String header) {
        Long hotelId = jwtUtil.extractHotelId(header.substring(7));
        RequestCategory cat = categoryRepository.findById(id).orElse(null);
        if (cat == null || !cat.getHotelId().equals(hotelId)) return ResponseEntity.notFound().build();
        // Delete items first
        itemRepository.findByCategoryIdOrderBySortOrder(id).forEach(itemRepository::delete);
        categoryRepository.delete(cat);
        return ResponseEntity.ok(Map.of("deleted", true));
    }

    /** Add an item to a category */
    @PostMapping("/{id}/items")
    public ResponseEntity<?> addItem(@PathVariable Long id,
                                     @RequestHeader("Authorization") String header,
                                     @RequestBody Map<String, Object> body) {
        Long hotelId = jwtUtil.extractHotelId(header.substring(7));
        RequestCategory cat = categoryRepository.findById(id).orElse(null);
        if (cat == null || !cat.getHotelId().equals(hotelId)) return ResponseEntity.notFound().build();
        String name = body.get("name") != null ? body.get("name").toString().trim() : "";
        if (name.isBlank()) return ResponseEntity.badRequest().body(Map.of("error", "Item name is required"));
        int maxQty = body.get("maxQuantity") != null ? Integer.parseInt(body.get("maxQuantity").toString()) : 1;

        int maxOrder = itemRepository.findByCategoryIdOrderBySortOrder(id)
                .stream().mapToInt(RequestItem::getSortOrder).max().orElse(0);

        String nameAm = body.get("nameAm") != null ? body.get("nameAm").toString().trim() : null;

        boolean schedulable = body.get("schedulable") != null && Boolean.parseBoolean(body.get("schedulable").toString());
        int slotInterval = body.get("slotIntervalMins") != null ? Math.max(5, Integer.parseInt(body.get("slotIntervalMins").toString())) : 60;
        int capacity = body.get("capacity") != null ? Math.max(1, Integer.parseInt(body.get("capacity").toString())) : 10;

        RequestItem item = new RequestItem();
        item.setCategoryId(id);
        item.setName(name);
        if (nameAm != null && !nameAm.isBlank()) item.setNameAm(nameAm);
        item.setMaxQuantity(schedulable ? 1 : Math.max(1, maxQty));
        item.setSchedulable(schedulable);
        item.setSlotIntervalMins(slotInterval);
        item.setCapacity(capacity);
        item.setSortOrder(maxOrder + 1);
        itemRepository.save(item);
        Map<String, Object> resp = new HashMap<>();
        resp.put("id",               item.getId());
        resp.put("name",             item.getName());
        resp.put("nameAm",           item.getNameAm() != null ? item.getNameAm() : "");
        resp.put("enabled",          item.isEnabled());
        resp.put("maxQuantity",      item.getMaxQuantity());
        resp.put("schedulable",      item.isSchedulable());
        resp.put("slotIntervalMins", item.getSlotIntervalMins());
        resp.put("capacity",         item.getCapacity());
        return ResponseEntity.ok(resp);
    }

    /** Update an item (name, maxQuantity, enabled) */
    @PatchMapping("/items/{itemId}")
    public ResponseEntity<?> updateItem(@PathVariable Long itemId,
                                        @RequestHeader("Authorization") String header,
                                        @RequestBody Map<String, Object> body) {
        Long hotelId = jwtUtil.extractHotelId(header.substring(7));
        RequestItem item = itemRepository.findById(itemId).orElse(null);
        if (item == null) return ResponseEntity.notFound().build();
        // Verify ownership via category
        RequestCategory cat = categoryRepository.findById(item.getCategoryId()).orElse(null);
        if (cat == null || !cat.getHotelId().equals(hotelId)) return ResponseEntity.status(403).build();

        if (body.containsKey("name") && !body.get("name").toString().isBlank())
            item.setName(body.get("name").toString().trim());
        if (body.containsKey("nameAm"))
            item.setNameAm(body.get("nameAm") != null ? body.get("nameAm").toString().trim() : null);
        if (body.containsKey("enabled"))
            item.setEnabled(Boolean.parseBoolean(body.get("enabled").toString()));
        if (body.containsKey("maxQuantity"))
            item.setMaxQuantity(Math.max(1, Integer.parseInt(body.get("maxQuantity").toString())));
        if (body.containsKey("schedulable"))
            item.setSchedulable(Boolean.parseBoolean(body.get("schedulable").toString()));
        if (body.containsKey("slotIntervalMins"))
            item.setSlotIntervalMins(Math.max(5, Integer.parseInt(body.get("slotIntervalMins").toString())));
        if (body.containsKey("capacity"))
            item.setCapacity(Math.max(1, Integer.parseInt(body.get("capacity").toString())));
        itemRepository.save(item);
        Map<String, Object> resp = new HashMap<>();
        resp.put("id",               item.getId());
        resp.put("name",             item.getName());
        resp.put("nameAm",           item.getNameAm() != null ? item.getNameAm() : "");
        resp.put("enabled",          item.isEnabled());
        resp.put("maxQuantity",      item.getMaxQuantity());
        resp.put("schedulable",      item.isSchedulable());
        resp.put("slotIntervalMins", item.getSlotIntervalMins());
        resp.put("capacity",         item.getCapacity());
        return ResponseEntity.ok(resp);
    }

    /** Delete an item */
    @DeleteMapping("/items/{itemId}")
    public ResponseEntity<?> deleteItem(@PathVariable Long itemId,
                                        @RequestHeader("Authorization") String header) {
        Long hotelId = jwtUtil.extractHotelId(header.substring(7));
        RequestItem item = itemRepository.findById(itemId).orElse(null);
        if (item == null) return ResponseEntity.notFound().build();
        RequestCategory cat = categoryRepository.findById(item.getCategoryId()).orElse(null);
        if (cat == null || !cat.getHotelId().equals(hotelId)) return ResponseEntity.status(403).build();
        itemRepository.delete(item);
        return ResponseEntity.ok(Map.of("deleted", true));
    }
}
