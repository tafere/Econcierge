package com.econcierge.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "staff")
public class Staff {

    public enum Role { SUPER_ADMIN, ADMIN, STAFF, HOUSEKEEPING, MAINTENANCE, TRANSPORT, RESTAURANT, CAFE_BAR, SPA, GYM, MEETING_CONFERENCE }

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "hotel_id")
    private Long hotelId;

    @Column(nullable = false, unique = true, length = 100)
    private String username;

    @Column(nullable = false, length = 200)
    private String password;

    @Column(name = "full_name", nullable = false, length = 200)
    private String fullName;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "staff_roles", joinColumns = @JoinColumn(name = "staff_id"))
    @Column(name = "role", nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    private Set<Role> roles = new HashSet<>();

    @Column(nullable = false)
    private boolean enabled = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); }

    public boolean hasRole(Role r)  { return roles.contains(r); }
    public boolean isAdminOrAbove() { return hasRole(Role.ADMIN) || hasRole(Role.SUPER_ADMIN); }

    public Long getId()                   { return id; }
    public Long getHotelId()              { return hotelId; }
    public void setHotelId(Long v)        { this.hotelId = v; }
    public String getUsername()           { return username; }
    public void setUsername(String v)     { this.username = v; }
    public String getPassword()           { return password; }
    public void setPassword(String v)     { this.password = v; }
    public String getFullName()           { return fullName; }
    public void setFullName(String v)     { this.fullName = v; }
    public Set<Role> getRoles()           { return roles; }
    public void setRoles(Set<Role> v)     { this.roles = v; }
    public boolean isEnabled()            { return enabled; }
    public void setEnabled(boolean v)     { this.enabled = v; }
    public LocalDateTime getCreatedAt()   { return createdAt; }
}
