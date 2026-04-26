package com.econcierge.controller;

import com.econcierge.model.RequestCategory;
import com.econcierge.model.RequestItem;
import com.econcierge.model.Room;
import com.econcierge.repository.RequestCategoryRepository;
import com.econcierge.repository.RequestItemRepository;
import com.econcierge.repository.RoomRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/guest")
public class AiIntakeController {

    private static final Logger log = LoggerFactory.getLogger(AiIntakeController.class);

    @Value("${anthropic.api-key:}")
    private String apiKey;

    private final RoomRepository roomRepo;
    private final RequestCategoryRepository categoryRepo;
    private final RequestItemRepository itemRepo;
    private final ObjectMapper mapper = new ObjectMapper();
    private final RestClient http = RestClient.create();

    public AiIntakeController(RoomRepository r, RequestCategoryRepository c, RequestItemRepository i) {
        this.roomRepo = r;
        this.categoryRepo = c;
        this.itemRepo = i;
    }

    public record AiRequest(Long roomId, String text) {}

    @PostMapping("/ai-intake")
    public ResponseEntity<?> aiIntake(@RequestBody AiRequest req) {
        if (apiKey == null || apiKey.isBlank()) {
            return ResponseEntity.status(503).body(Map.of("error", "AI not configured"));
        }
        if (req.text() == null || req.text().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No text provided"));
        }

        Room room = roomRepo.findById(req.roomId()).orElse(null);
        if (room == null) return ResponseEntity.notFound().build();

        // Build menu with both English and Amharic names
        List<RequestCategory> categories = categoryRepo.findByHotelIdOrderBySortOrder(room.getHotelId());
        StringBuilder menu = new StringBuilder("[");
        for (int i = 0; i < categories.size(); i++) {
            RequestCategory cat = categories.get(i);
            List<RequestItem> items = itemRepo.findByCategoryIdAndEnabledTrueOrderBySortOrder(cat.getId());
            menu.append("{\"catId\":").append(cat.getId())
                .append(",\"cat\":\"").append(esc(cat.getName()))
                .append("\",\"catAm\":\"").append(esc(cat.getNameAm()))
                .append("\",\"icon\":\"").append(esc(cat.getIcon()))
                .append("\",\"items\":[");
            for (int j = 0; j < items.size(); j++) {
                RequestItem item = items.get(j);
                menu.append("{\"id\":").append(item.getId())
                    .append(",\"name\":\"").append(esc(item.getName()))
                    .append("\",\"nameAm\":\"").append(esc(item.getNameAm()))
                    .append("\",\"max\":").append(item.getMaxQuantity()).append("}");
                if (j < items.size() - 1) menu.append(",");
            }
            menu.append("]}");
            if (i < categories.size() - 1) menu.append(",");
        }
        menu.append("]");

        String prompt = "You are a hotel concierge assistant. A guest described what they need.\n\n" +
            "Hotel menu (each item has English name and Amharic nameAm): " + menu + "\n\n" +
            "Guest says: \"" + esc(req.text().trim()) + "\"\n\n" +
            "Respond with a JSON object (no markdown, no explanation):\n" +
            "{\"detectedLang\":\"en\",\"suggestions\":[{\"itemId\":50,\"itemName\":\"Extra Towels\",\"categoryName\":\"Housekeeping\",\"categoryIcon\":\"broom\",\"quantity\":1,\"notes\":\"\"}]}\n\n" +
            "Rules:\n" +
            "- detectedLang must be \"am\" if the guest wrote/spoke in Amharic, otherwise \"en\"\n" +
            "- If detectedLang is \"am\": use nameAm for itemName and catAm for categoryName from the menu\n" +
            "- If detectedLang is \"en\": use name for itemName and cat for categoryName\n" +
            "- Match each need to the closest menu item\n" +
            "- Extract quantity (default 1, never exceed max)\n" +
            "- Put specific instructions in notes\n" +
            "- If nothing matches, return {\"detectedLang\":\"en\",\"suggestions\":[]}";

        try {
            Map<String, Object> requestBody = Map.of(
                "model", "claude-haiku-4-5-20251001",
                "max_tokens", 1024,
                "messages", List.of(Map.of("role", "user", "content", prompt))
            );

            log.info("AI intake roomId={} text='{}'", req.roomId(), req.text());

            String response = http.post()
                .uri("https://api.anthropic.com/v1/messages")
                .header("x-api-key", apiKey)
                .header("anthropic-version", "2023-06-01")
                .contentType(MediaType.APPLICATION_JSON)
                .body(requestBody)
                .retrieve()
                .body(String.class);

            JsonNode root = mapper.readTree(response);
            String text = root.path("content").get(0).path("text").asText("{}").trim();
            if (text.startsWith("```")) {
                text = text.replaceAll("(?s)```[a-z]*\\n?", "").replace("```", "").trim();
            }

            JsonNode result = mapper.readTree(text);

            // Ensure categoryIcon is present on every suggestion
            String detectedLang = result.path("detectedLang").asText("en");
            ArrayNode suggestions = (ArrayNode) result.path("suggestions");
            for (JsonNode s : suggestions) {
                if (s instanceof ObjectNode on && (!s.has("categoryIcon") || s.get("categoryIcon").asText().isBlank())) {
                    // find icon from menu
                    long itemId = s.path("itemId").asLong();
                    for (RequestCategory cat : categories) {
                        List<RequestItem> items = itemRepo.findByCategoryIdAndEnabledTrueOrderBySortOrder(cat.getId());
                        for (RequestItem item : items) {
                            if (item.getId().equals(itemId)) {
                                on.put("categoryIcon", cat.getIcon() != null ? cat.getIcon() : "");
                            }
                        }
                    }
                }
            }

            ObjectNode out = mapper.createObjectNode();
            out.put("detectedLang", detectedLang);
            out.set("suggestions", suggestions);
            return ResponseEntity.ok(out);

        } catch (RestClientResponseException e) {
            log.error("Anthropic API error {}: {}", e.getStatusCode(), e.getResponseBodyAsString());
            return ResponseEntity.status(500).body(Map.of("error", "AI request failed"));
        } catch (Exception e) {
            log.error("AI intake error", e);
            return ResponseEntity.status(500).body(Map.of("error", "AI request failed: " + e.getMessage()));
        }
    }

    private String esc(String s) {
        return s == null ? "" : s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
