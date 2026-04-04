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
        if (hotelRepository.count() > 0) return;

        // Create demo hotel
        Hotel hotel = new Hotel();
        hotel.setName("Skylight Hotel");
        hotel.setSlug("skylight");
        hotel.setAddress("Addis Ababa, Ethiopia");
        hotel.setPhone("+251111234567");
        hotel.setEmail("info@skylighthotel.com");
        hotelRepository.save(hotel);

        // Create admin staff
        Staff admin = new Staff();
        admin.setHotelId(hotel.getId());
        admin.setUsername("admin");
        admin.setPassword(passwordEncoder.encode("admin123"));
        admin.setFullName("Hotel Administrator");
        admin.setRole(Staff.Role.ADMIN);
        staffRepository.save(admin);

        // Create sample rooms
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

        // Seed categories and items
        seedCategory(hotel.getId(), "Housekeeping", "sparkles", 1,
            List.of("Extra Towels", "Extra Pillows", "Extra Blanket", "Toiletries", "Room Cleaning"));

        seedCategory(hotel.getId(), "Food & Beverage", "utensils", 2,
            List.of("Room Service Menu", "Extra Water Bottles", "Coffee / Tea", "Ice Bucket", "Minibar Restock"));

        seedCategory(hotel.getId(), "Maintenance", "wrench", 3,
            List.of("AC / Heating Issue", "TV Not Working", "Plumbing Issue", "Lighting Issue", "Safe / Lock Issue"));

        seedCategory(hotel.getId(), "Concierge", "concierge-bell", 4,
            List.of("Taxi / Transport", "Tour Information", "Wake-Up Call", "Luggage Assistance", "Airport Shuttle"));

        System.out.println("Econcierge: demo hotel seeded — login: admin / admin123");
    }

    private void seedCategory(Long hotelId, String name, String icon, int order, List<String> items) {
        RequestCategory cat = new RequestCategory();
        cat.setHotelId(hotelId);
        cat.setName(name);
        cat.setIcon(icon);
        cat.setSortOrder(order);
        categoryRepository.save(cat);

        for (int i = 0; i < items.size(); i++) {
            RequestItem item = new RequestItem();
            item.setCategoryId(cat.getId());
            item.setName(items.get(i));
            item.setSortOrder(i);
            itemRepository.save(item);
        }
    }
}
