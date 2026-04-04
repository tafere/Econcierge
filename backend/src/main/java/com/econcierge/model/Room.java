package com.econcierge.model;

import jakarta.persistence.*;

@Entity
@Table(name = "rooms")
public class Room {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "hotel_id", nullable = false)
    private Long hotelId;

    @Column(name = "room_number", nullable = false, length = 20)
    private String roomNumber;

    @Column(length = 10)
    private String floor;

    @Column(name = "room_type", length = 50)
    private String roomType;

    @Column(name = "qr_token", nullable = false, unique = true, length = 36)
    private String qrToken;

    @Column(nullable = false)
    private boolean enabled = true;

    public Long getId()                  { return id; }
    public Long getHotelId()             { return hotelId; }
    public void setHotelId(Long v)       { this.hotelId = v; }
    public String getRoomNumber()        { return roomNumber; }
    public void setRoomNumber(String v)  { this.roomNumber = v; }
    public String getFloor()             { return floor; }
    public void setFloor(String v)       { this.floor = v; }
    public String getRoomType()          { return roomType; }
    public void setRoomType(String v)    { this.roomType = v; }
    public String getQrToken()           { return qrToken; }
    public void setQrToken(String v)     { this.qrToken = v; }
    public boolean isEnabled()           { return enabled; }
    public void setEnabled(boolean v)    { this.enabled = v; }
}
