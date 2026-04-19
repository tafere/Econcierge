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
            admin.setRoles(new java.util.HashSet<>(java.util.Set.of(Staff.Role.ADMIN)));
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
        ensureCategory(hotel.getId(), "Housekeeping", "የቤት አያያዝ", "broom", 1, List.of(
            item("Room Cleaning",     "ክፍል ማፅዳት",     null, 1),
            item("Turn-Down Service", "አልጋ ማስተካከል",   null, 1),
            item("Make Up Room",      "ክፍል ማሰናዳት",    null, 1)
        ));

        ensureCategory(hotel.getId(), "Amenities", "አቅርቦቶች", "sparkles", 2, List.of(
            item("Extra Towels",   "ተጨማሪ ፎጣዎች",              null, 3),
            item("Extra Pillows",  "ተጨማሪ ትራሶች",              null, 3),
            item("Extra Blanket",  "ተጨማሪ ብርድ ልብስ",            null, 2),
            item("Bathrobe",       "የገላ መታጠቢያ ልብስ",           null, 2),
            item("Extra Hangers",  "ተጨማሪ የመስቀያ መንጠቆዎች",       null, 5)
        ));

        ensureCategory(hotel.getId(), "Toiletries", "የፀዳት እቃዎች", "soap", 3, List.of(
            item("Toothbrush",    "የጥርስ ብሩሽ",    null, 2),
            item("Toothpaste",    "የጥርስ ሳሙና",    null, 2),
            item("Shampoo",       "ሻምፑ",          null, 2),
            item("Conditioner",   "ኮንዲሽነር",       null, 2),
            item("Body Lotion",   "የሰውነት ቅባት",   null, 2),
            item("Razor",         "ምላጭ",          null, 2),
            item("Shower Cap",    "የሻወር ኮፍያ",    null, 2),
            item("Cotton Swabs",  "የጆሮ መጥረጊያ ኩኪ", null, 2)
        ));

        ensureCategory(hotel.getId(), "Food & Beverage", "ምግብ እና መጠጥ", "utensils", 4, List.of(
            item("Room Service Menu",   "የክፍል አገልግሎት ምግብ ዝርዝር", null, 1),
            item("Extra Water Bottles", "ተጨማሪ የታሸጉ ውሃዎች",       null, 4),
            item("Coffee / Tea",        "ቡና / ሻይ",                null, 4),
            item("Ice Bucket",          "የበረዶ ባልዲ",               null, 1),
            item("Minibar Restock",     "ሚኒባር መሙላት",              null, 1)
        ));

        ensureCategory(hotel.getId(), "Maintenance", "ጥገና", "wrench", 5, List.of(
            item("AC / Heating Issue", "የኤሲ / የማሞቂያ ችግር",  null, 1),
            item("TV Not Working",     "ቲቪ አይሰራም",         null, 1),
            item("Plumbing Issue",     "የቧንቧ ችግር",          null, 1),
            item("Lighting Issue",     "የመብራት ችግር",         null, 1),
            item("Safe / Lock Issue",  "የካዝና / የቁልፍ ችግር",  null, 1)
        ));

        ensureCategory(hotel.getId(), "Concierge", "ኮንሲዬርጅ", "concierge-bell", 6, List.of(
            item("Taxi / Transport",    "ታክሲ / ትራንስፖርት",  null, 1),
            item("Tour Information",    "የቱሪስት መረጃ",        null, 1),
            item("Wake-Up Call",        "የቀስቃሽ ጥሪ",         null, 1),
            item("Luggage Assistance",  "የሻንጣ እርዳታ",        null, 1),
            item("Airport Shuttle",     "የኤርፖርት ትራንስፖርት",  null, 1)
        ));

        if (staffRepository.findByUsername("housekeeping").isEmpty()) {
            Staff hk = new Staff();
            hk.setHotelId(hotel.getId());
            hk.setUsername("housekeeping");
            hk.setPassword(passwordEncoder.encode("house123"));
            hk.setFullName("Housekeeping Team");
            hk.setRoles(new java.util.HashSet<>(java.util.Set.of(Staff.Role.HOUSEKEEPING)));
            staffRepository.save(hk);
        }

        if (staffRepository.findByUsername("maintenance").isEmpty()) {
            Staff mt = new Staff();
            mt.setHotelId(hotel.getId());
            mt.setUsername("maintenance");
            mt.setPassword(passwordEncoder.encode("maint123"));
            mt.setFullName("Maintenance Team");
            mt.setRoles(new java.util.HashSet<>(java.util.Set.of(Staff.Role.MAINTENANCE)));
            staffRepository.save(mt);
        }

        // Seed platform super admin from env vars
        String superUsername = System.getenv().getOrDefault("SUPER_ADMIN_USERNAME", "superadmin");
        String superPassword = System.getenv().getOrDefault("SUPER_ADMIN_PASSWORD", "super123");
        if (staffRepository.findByUsername(superUsername).isEmpty()) {
            Staff superAdmin = new Staff();
            superAdmin.setHotelId(null);
            superAdmin.setUsername(superUsername);
            superAdmin.setPassword(passwordEncoder.encode(superPassword));
            superAdmin.setFullName("Platform Admin");
            superAdmin.setRoles(new java.util.HashSet<>(java.util.Set.of(Staff.Role.SUPER_ADMIN)));
            staffRepository.save(superAdmin);
            System.out.println("Econcierge: super admin created — login: " + superUsername + " / " + superPassword);
        }
        System.out.println("Econcierge: demo hotel seeded — login: admin / admin123");
    }

    private record ItemDef(String name, String nameAm, String description, int maxQuantity) {}

    private ItemDef item(String name, String nameAm, String description, int maxQuantity) {
        return new ItemDef(name, nameAm, description, maxQuantity);
    }

    private void ensureCategory(Long hotelId, String name, String nameAm, String icon, int order, List<ItemDef> items) {
        RequestCategory cat = categoryRepository
                .findByHotelIdAndName(hotelId, name)
                .orElseGet(() -> {
                    RequestCategory c = new RequestCategory();
                    c.setHotelId(hotelId);
                    c.setName(name);
                    c.setNameAm(nameAm);
                    c.setIcon(icon);
                    c.setSortOrder(order);
                    return categoryRepository.save(c);
                });
        // Back-fill nameAm on existing categories
        if (cat.getNameAm() == null && nameAm != null) {
            cat.setNameAm(nameAm);
            categoryRepository.save(cat);
        }

        for (int i = 0; i < items.size(); i++) {
            ItemDef def = items.get(i);
            boolean exists = itemRepository.existsByCategoryIdAndName(cat.getId(), def.name());
            if (!exists) {
                RequestItem item = new RequestItem();
                item.setCategoryId(cat.getId());
                item.setName(def.name());
                item.setNameAm(def.nameAm());
                item.setDescription(def.description());
                item.setSortOrder(i);
                item.setMaxQuantity(def.maxQuantity());
                itemRepository.save(item);
            } else if (def.nameAm() != null) {
                // Back-fill nameAm for existing items that were seeded before this field existed
                itemRepository.findByCategoryIdOrderBySortOrder(cat.getId()).stream()
                        .filter(it -> it.getName().equals(def.name()) && it.getNameAm() == null)
                        .findFirst()
                        .ifPresent(it -> { it.setNameAm(def.nameAm()); itemRepository.save(it); });
            }
        }
    }
}
