package com.econcierge.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "bookings")
public class Booking {

    public enum Status { PENDING, CONFIRMED, CANCELLED }

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "hotel_id", nullable = false)
    private Long hotelId;

    @Column(name = "item_id", nullable = false)
    private Long itemId;

    @Column(name = "room_id", nullable = false)
    private Long roomId;

    @Column(name = "slot_time", nullable = false)
    private LocalDateTime slotTime;

    @Column(name = "guest_count", nullable = false)
    private int guestCount = 1;

    @Column(length = 500)
    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status = Status.PENDING;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); }

    public Long getId()                      { return id; }
    public Long getHotelId()                 { return hotelId; }
    public void setHotelId(Long v)           { this.hotelId = v; }
    public Long getItemId()                  { return itemId; }
    public void setItemId(Long v)            { this.itemId = v; }
    public Long getRoomId()                  { return roomId; }
    public void setRoomId(Long v)            { this.roomId = v; }
    public LocalDateTime getSlotTime()       { return slotTime; }
    public void setSlotTime(LocalDateTime v) { this.slotTime = v; }
    public int getGuestCount()               { return guestCount; }
    public void setGuestCount(int v)         { this.guestCount = v; }
    public String getNotes()                 { return notes; }
    public void setNotes(String v)           { this.notes = v; }
    public Status getStatus()                { return status; }
    public void setStatus(Status v)          { this.status = v; }
    public LocalDateTime getCreatedAt()      { return createdAt; }
}
