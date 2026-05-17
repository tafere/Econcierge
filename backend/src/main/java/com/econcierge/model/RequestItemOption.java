package com.econcierge.model;

import jakarta.persistence.*;

@Entity
@Table(name = "request_item_options")
public class RequestItemOption {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "item_id", nullable = false)
    private Long itemId;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(name = "name_am", length = 200)
    private String nameAm;

    @Column(name = "sort_order")
    private int sortOrder = 0;

    @Column(nullable = false)
    private boolean enabled = true;

    public Long getId()               { return id; }
    public Long getItemId()           { return itemId; }
    public void setItemId(Long v)     { this.itemId = v; }
    public String getName()           { return name; }
    public void setName(String v)     { this.name = v; }
    public String getNameAm()         { return nameAm; }
    public void setNameAm(String v)   { this.nameAm = v; }
    public int getSortOrder()         { return sortOrder; }
    public void setSortOrder(int v)   { this.sortOrder = v; }
    public boolean isEnabled()        { return enabled; }
    public void setEnabled(boolean v) { this.enabled = v; }
}
