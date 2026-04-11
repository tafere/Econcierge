package com.econcierge.model;

import jakarta.persistence.*;

@Entity
@Table(name = "request_categories")
public class RequestCategory {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "hotel_id", nullable = false)
    private Long hotelId;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "name_am", length = 100)
    private String nameAm;

    @Column(length = 50)
    private String icon;

    @Column(name = "sort_order")
    private int sortOrder = 0;

    public Long getId()                  { return id; }
    public Long getHotelId()             { return hotelId; }
    public void setHotelId(Long v)       { this.hotelId = v; }
    public String getName()              { return name; }
    public void setName(String v)        { this.name = v; }
    public String getNameAm()            { return nameAm; }
    public void setNameAm(String v)      { this.nameAm = v; }
    public String getIcon()              { return icon; }
    public void setIcon(String v)        { this.icon = v; }
    public int getSortOrder()            { return sortOrder; }
    public void setSortOrder(int v)      { this.sortOrder = v; }
}
