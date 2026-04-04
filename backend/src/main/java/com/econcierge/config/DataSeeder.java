package com.econcierge.config;

import com.econcierge.model.*;
import com.econcierge.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

@Component
public class DataSeeder implements CommandLineRunner {

    private final HotelRepository hotelRepository;
    private final StaffRepository staffRepository;
    private final RoomRepository roomRepository;
    private final RequestCategoryRepository categoryRepository;
    private final RequestItemRepository itemRepository;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(HotelRepository hotelRepository, StaffRepository staffRepository,
                      RoomRepository roomRepository, RequestCategoryRepository categoryRepository,
                      RequestItemRepository itemRepository, PasswordEncoder passwordEncoder) {
        this.hotelRepository = hotelRepository;
        this.staffRepository = staffRepository;
        this.roomRepository = roomRepository;
        this.categoryRepository = categoryRepository;
        this.itemRepository = itemRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        Hotel hotel;
        if (hotelRepository.count() == 0) {
            hotel = new Hotel();
            hotel.setName("Ethiopian Skylight Hotel");
            hotel.setSlug("skylight");
            hotel.setTagline("Where the Sky is the Limit");
            hotel.setAddress("Bole Sub City, Addis Ababa, Ethiopia");
            hotel.setPhone("+251116671515");
            hotel.setEmail("info@ethiopianskylighthotel.com");
            hotel.setWebsite("https://www.ethiopianskylighthotel.com");
            hotelRepository.save(hotel);

            Staff admin = new Staff();
            admin.setHotelId(hotel.getId());
            admin.setUsername("admin");
            admin.setPassword(passwordEncoder.encode("admin123"));
            admin.setFullName("Hotel Administrator");
            admin.setRole(Staff.Role.ADMIN);
            staffRepository.save(admin);

            String[] floors = {"1", "2", "3", "4", "5"};
            int roomNum = 101;
            for (String floor : floors) {
                for (int i = 0; i < 5; i++) {
                    Room room = new Room();
                    room.setHotelId(hotel.getId());
                    room.setRoomNumber(String.valueOf(roomNum++));
                    room.setFloor(floor);
                    room.setRoomType(i == 0 ? "Suite" : "Standard");
                    room.setQrToken(UUID.randomUUID().toString());
                    roomRepository.save(room);
                }
                roomNum = (Integer.parseInt(floor) + 1) * 100 + 1;
            }
        } else {
            hotel = hotelRepository.findBySlug("skylight").orElse(null);
            if (hotel == null) return;
        }

        // Idempotent category seeding — adds missing categories/items only
        ensureCategory(hotel.getId(), "Housekeeping", "broom", 1, List.of(
            item("Room Cleaning",     null, 1),
            item("Turn-Down Service", null, 1),
            item("Make Up Room",      null, 1)
        ));

        ensureCategory(hotel.getId(), "Amenities", "sparkles", 2, List.of(
            item("Extra Towels",   null, 3),
            item("Extra Pillows",  null, 3),
            item("Extra Blanket",  null, 2),
            item("Bathrobe",       null, 2),
            item("Extra Hangers",  null, 5)
        ));

        ensureCategory(hotel.getId(), "Toiletries", "soap", 3, List.of(
            item("Toothbrush",    null, 2),
            item("Toothpaste",    null, 2),
            item("Shampoo",       null, 2),
            item("Conditioner",   null, 2),
            item("Body Lotion",   null, 2),
            item("Razor",         null, 2),
            item("Shower Cap",    null, 2),
            item("Cotton Swabs",  null, 2)
        ));

        ensureCategory(hotel.getId(), "Food & Beverage", "utensils", 4, List.of(
            item("Room Service Menu",   null, 1),
            item("Extra Water Bottles", null, 4),
            item("Coffee / Tea",        null, 4),
            item("Ice Bucket",          null, 1),
            item("Minibar Restock",     null, 1)
        ));

        ensureCategory(hotel.getId(), "Maintenance", "wrench", 5, List.of(
            item("AC / Heating Issue", null, 1),
            item("TV Not Working",     null, 1),
            item("Plumbing Issue",     null, 1),
            item("Lighting Issue",     null, 1),
            item("Safe / Lock Issue",  null, 1)
        ));

        ensureCategory(hotel.getId(), "Concierge", "concierge-bell", 6, List.of(
            item("Taxi / Transport",    null, 1),
            item("Tour Information",    null, 1),
            item("Wake-Up Call",        null, 1),
            item("Luggage Assistance",  null, 1),
            item("Airport Shuttle",     null, 1)
        ));

        System.out.println("Econcierge: demo hotel seeded — login: admin / admin123");
    }

    private record ItemDef(String name, String description, int maxQuantity) {}

    private ItemDef item(String name, String description, int maxQuantity) {
        return new ItemDef(name, description, maxQuantity);
    }

    private void ensureCategory(Long hotelId, String name, String icon, int order, List<ItemDef> items) {
        RequestCategory cat = categoryRepository
                .findByHotelIdAndName(hotelId, name)
                .orElseGet(() -> {
                    RequestCategory c = new RequestCategory();
                    c.setHotelId(hotelId);
                    c.setName(name);
                    c.setIcon(icon);
                    c.setSortOrder(order);
                    return categoryRepository.save(c);
                });

        for (int i = 0; i < items.size(); i++) {
            ItemDef def = items.get(i);
            if (!itemRepository.existsByCategoryIdAndName(cat.getId(), def.name())) {
                RequestItem item = new RequestItem();
                item.setCategoryId(cat.getId());
                item.setName(def.name());
                item.setDescription(def.description());
                item.setSortOrder(i);
                item.setMaxQuantity(def.maxQuantity());
                itemRepository.save(item);
            }
        }
    }
}
