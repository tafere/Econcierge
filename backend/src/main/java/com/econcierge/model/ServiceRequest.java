package com.econcierge.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "service_requests")
public class ServiceRequest {

    public enum Status { PENDING, IN_PROGRESS, DONE, CANCELLED, DECLINED }

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "hotel_id", nullable = false)
    private Long hotelId;

    @Column(name = "room_id", nullable = false)
    private Long roomId;

    @Column(name = "item_id", nullable = false)
    private Long itemId;

    @Column(length = 1000)
    private String notes;

    @Column(nullable = false)
    private int quantity = 1;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status = Status.PENDING;

    @Column(name = "assigned_to")
    private Long assignedTo;

    @Column(name = "staff_comment", length = 500)
    private String staffComment;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "accepted_at")
    private LocalDateTime acceptedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); }

    @PreUpdate
    protected void onUpdate() { updatedAt = LocalDateTime.now(); }

    public Long getId()                         { return id; }
    public Long getHotelId()                    { return hotelId; }
    public void setHotelId(Long v)              { this.hotelId = v; }
    public Long getRoomId()                     { return roomId; }
    public void setRoomId(Long v)               { this.roomId = v; }
    public Long getItemId()                     { return itemId; }
    public void setItemId(Long v)               { this.itemId = v; }
    public String getNotes()                    { return notes; }
    public void setNotes(String v)              { this.notes = v; }
    public int getQuantity()                    { return quantity; }
    public void setQuantity(int v)              { this.quantity = v; }
    public Status getStatus()                   { return status; }
    public void setStatus(Status v)             { this.status = v; }
    public Long getAssignedTo()                 { return assignedTo; }
    public void setAssignedTo(Long v)           { this.assignedTo = v; }
    public String getStaffComment()             { return staffComment; }
    public void setStaffComment(String v)       { this.staffComment = v; }
    public LocalDateTime getCreatedAt()         { return createdAt; }
    public LocalDateTime getUpdatedAt()         { return updatedAt; }
    public LocalDateTime getAcceptedAt()        { return acceptedAt; }
    public void setAcceptedAt(LocalDateTime v)  { this.acceptedAt = v; }
    public LocalDateTime getCompletedAt()       { return completedAt; }
    public void setCompletedAt(LocalDateTime v) { this.completedAt = v; }
}
