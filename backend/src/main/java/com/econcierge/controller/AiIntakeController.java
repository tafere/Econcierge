package com.econcierge.controller;

import com.econcierge.model.RequestCategory;
import com.econcierge.model.RequestItem;
import com.econcierge.model.Room;
import com.econcierge.repository.RequestCategoryRepository;
import com.econcierge.repository.RequestItemRepository;
import com.econcierge.repository.RoomRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
            log.warn("AI intake called but ANTHROPIC_API_KEY is not configured");
            return ResponseEntity.status(503).body(Map.of("error", "AI not configured"));
        }
        if (req.text() == null || req.text().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No text provided"));
        }

        Room room = roomRepo.findById(req.roomId()).orElse(null);
        if (room == null) return ResponseEntity.notFound().build();

        // Build compact menu JSON for the prompt
        List<RequestCategory> categories = categoryRepo.findByHotelIdOrderBySortOrder(room.getHotelId());
        StringBuilder menu = new StringBuilder("[");
        for (int i = 0; i < categories.size(); i++) {
            RequestCategory cat = categories.get(i);
            List<RequestItem> items = itemRepo.findByCategoryIdAndEnabledTrueOrderBySortOrder(cat.getId());
            menu.append("{\"catId\":").append(cat.getId())
                .append(",\"cat\":\"").append(esc(cat.getName()))
                .append("\",\"icon\":\"").append(esc(cat.getIcon()))
                .append("\",\"items\":[");
            for (int j = 0; j < items.size(); j++) {
                RequestItem item = items.get(j);
                menu.append("{\"id\":").append(item.getId())
                    .append(",\"name\":\"").append(esc(item.getName()))
                    .append("\",\"max\":").append(item.getMaxQuantity()).append("}");
                if (j < items.size() - 1) menu.append(",");
            }
            menu.append("]}");
            if (i < categories.size() - 1) menu.append(",");
        }
        menu.append("]");

        String prompt = "You are a hotel concierge assistant. A guest described what they need — possibly in any language (Amharic, Arabic, French, English, etc.).\n" +
            "Match their request to items from the hotel menu below.\n\n" +
            "Menu (JSON): " + menu + "\n\n" +
            "Guest says: \"" + esc(req.text().trim()) + "\"\n\n" +
            "Return ONLY a valid JSON array — no markdown fences, no explanation:\n" +
            "[{\"itemId\":50,\"itemName\":\"Extra Towels\",\"categoryName\":\"Housekeeping\",\"categoryIcon\":\"broom\",\"quantity\":1,\"notes\":\"\"}]\n\n" +
            "Rules:\n" +
            "- Match every distinct need to the closest menu item (use item id/name/categoryName/categoryIcon exactly from the menu)\n" +
            "- Extract quantity if stated; default 1; never exceed max\n" +
            "- Put any specific guest instructions in notes (e.g. timing, preferences)\n" +
            "- Understand any human language\n" +
            "- If nothing matches, return []";

        try {
            Map<String, Object> requestBody = Map.of(
                "model", "claude-haiku-4-5-20251001",
                "max_tokens", 1024,
                "messages", List.of(Map.of("role", "user", "content", prompt))
            );

            log.info("Calling Anthropic API for roomId={} text='{}'", req.roomId(), req.text());

            String response = http.post()
                .uri("https://api.anthropic.com/v1/messages")
                .header("x-api-key", apiKey)
                .header("anthropic-version", "2023-06-01")
                .contentType(MediaType.APPLICATION_JSON)
                .body(requestBody)
                .retrieve()
                .body(String.class);

            log.info("Anthropic response: {}", response);

            JsonNode root = mapper.readTree(response);
            String text = root.path("content").get(0).path("text").asText("[]").trim();

            // Strip markdown fences if Claude added them
            if (text.startsWith("```")) {
                text = text.replaceAll("(?s)```[a-z]*\\n?", "").replace("```", "").trim();
            }

            JsonNode suggestions = mapper.readTree(text);
            return ResponseEntity.ok(suggestions);

        } catch (RestClientResponseException e) {
            log.error("Anthropic API error {}: {}", e.getStatusCode(), e.getResponseBodyAsString());
            return ResponseEntity.status(500).body(Map.of("error", "AI request failed: " + e.getResponseBodyAsString()));
        } catch (Exception e) {
            log.error("AI intake unexpected error", e);
            return ResponseEntity.status(500).body(Map.of("error", "AI request failed: " + e.getMessage()));
        }
    }

    private String esc(String s) {
        return s == null ? "" : s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
