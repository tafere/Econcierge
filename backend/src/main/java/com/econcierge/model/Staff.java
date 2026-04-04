package com.econcierge.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "staff")
public class Staff {

    public enum Role { ADMIN, STAFF, HOUSEKEEPING, MAINTENANCE }

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "hotel_id", nullable = false)
    private Long hotelId;

    @Column(nullable = false, unique = true, length = 100)
    private String username;

    @Column(nullable = false, length = 200)
    private String password;

    @Column(name = "full_name", nullable = false, length = 200)
    private String fullName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role = Role.STAFF;

    @Column(nullable = false)
    private boolean enabled = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); }

    public Long getId()                  { return id; }
    public Long getHotelId()             { return hotelId; }
    public void setHotelId(Long v)       { this.hotelId = v; }
    public String getUsername()          { return username; }
    public void setUsername(String v)    { this.username = v; }
    public String getPassword()          { return password; }
    public void setPassword(String v)    { this.password = v; }
    public String getFullName()          { return fullName; }
    public void setFullName(String v)    { this.fullName = v; }
    public Role getRole()                { return role; }
    public void setRole(Role v)          { this.role = v; }
    public boolean isEnabled()           { return enabled; }
    public void setEnabled(boolean v)    { this.enabled = v; }
    public LocalDateTime getCreatedAt()  { return createdAt; }
}
