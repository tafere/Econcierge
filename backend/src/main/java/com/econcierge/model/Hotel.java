package com.econcierge.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "hotels")
public class Hotel {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false, unique = true, length = 100)
    private String slug;

    @Column(length = 500)
    private String address;

    @Column(length = 50)
    private String phone;

    @Column(length = 200)
    private String email;

    @Column(length = 300)
    private String tagline;

    @Column(name = "logo_url", length = 500)
    private String logoUrl;

    @Column(length = 300)
    private String website;

    @Column(name = "primary_color", length = 7)
    private String primaryColor;

    @Column(name = "eta_minutes")
    private Integer etaMinutes = 20;

    @Column(nullable = false)
    private boolean enabled = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); }

    public Long getId()                  { return id; }
    public String getName()              { return name; }
    public void setName(String v)        { this.name = v; }
    public String getSlug()              { return slug; }
    public void setSlug(String v)        { this.slug = v; }
    public String getAddress()           { return address; }
    public void setAddress(String v)     { this.address = v; }
    public String getPhone()             { return phone; }
    public void setPhone(String v)       { this.phone = v; }
    public String getEmail()             { return email; }
    public void setEmail(String v)       { this.email = v; }
    public String getTagline()           { return tagline; }
    public void setTagline(String v)     { this.tagline = v; }
    public String getLogoUrl()           { return logoUrl; }
    public void setLogoUrl(String v)     { this.logoUrl = v; }
    public String getWebsite()           { return website; }
    public void setWebsite(String v)     { this.website = v; }
    public String getPrimaryColor()           { return primaryColor; }
    public void setPrimaryColor(String v)     { this.primaryColor = v; }
    public Integer getEtaMinutes()         { return etaMinutes != null ? etaMinutes : 20; }
    public void setEtaMinutes(Integer v)   { this.etaMinutes = v; }
    public boolean isEnabled()             { return enabled; }
    public void setEnabled(boolean v)      { this.enabled = v; }
    public LocalDateTime getCreatedAt()    { return createdAt; }
}
