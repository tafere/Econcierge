package com.econcierge.controller;

import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Server-Sent Events — pushes new requests to the staff dashboard in real time.
 */
@RestController
@RequestMapping("/api/dashboard")
public class SseController {

    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public SseEmitter stream() {
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);
        emitters.add(emitter);
        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(()    -> emitters.remove(emitter));
        emitter.onError(e     -> emitters.remove(emitter));
        return emitter;
    }

    /** Called internally when a guest submits a request */
    public void broadcast(Long hotelId, Long requestId, String roomNumber, Long itemId, int quantity, String notes) {
        Map<String, Object> event = Map.of(
                "type",       "NEW_REQUEST",
                "requestId",  requestId,
                "hotelId",    hotelId,
                "roomNumber", roomNumber,
                "itemId",     itemId,
                "quantity",   quantity,
                "notes",      notes != null ? notes : ""
        );

        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name("request").data(event));
            } catch (IOException e) {
                emitters.remove(emitter);
            }
        }
    }
}
