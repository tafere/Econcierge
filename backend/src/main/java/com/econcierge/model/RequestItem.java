package com.econcierge.model;

import jakarta.persistence.*;

@Entity
@Table(name = "request_items")
public class RequestItem {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "category_id", nullable = false)
    private Long categoryId;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(name = "name_am", length = 200)
    private String nameAm;

    @Column(length = 500)
    private String description;

    @Column(name = "sort_order")
    private int sortOrder = 0;

    @Column(nullable = false)
    private boolean enabled = true;

    @Column(name = "max_quantity", nullable = false)
    private int maxQuantity = 1;

    @Column(nullable = false)
    private boolean schedulable = false;

    @Column(name = "slot_interval_mins", nullable = false)
    private int slotIntervalMins = 30;

    @Column(nullable = false)
    private int capacity = 15;

    public Long getId()                      { return id; }
    public Long getCategoryId()              { return categoryId; }
    public void setCategoryId(Long v)        { this.categoryId = v; }
    public String getName()                  { return name; }
    public void setName(String v)            { this.name = v; }
    public String getNameAm()               { return nameAm; }
    public void setNameAm(String v)         { this.nameAm = v; }
    public String getDescription()           { return description; }
    public void setDescription(String v)     { this.description = v; }
    public int getSortOrder()                { return sortOrder; }
    public void setSortOrder(int v)          { this.sortOrder = v; }
    public boolean isEnabled()               { return enabled; }
    public void setEnabled(boolean v)        { this.enabled = v; }
    public int getMaxQuantity()              { return maxQuantity; }
    public void setMaxQuantity(int v)        { this.maxQuantity = v; }
    public boolean isSchedulable()           { return schedulable; }
    public void setSchedulable(boolean v)    { this.schedulable = v; }
    public int getSlotIntervalMins()         { return slotIntervalMins; }
    public void setSlotIntervalMins(int v)   { this.slotIntervalMins = v; }
    public int getCapacity()                 { return capacity; }
    public void setCapacity(int v)           { this.capacity = v; }
}
