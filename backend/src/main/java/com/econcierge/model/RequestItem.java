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

    @Column(length = 500)
    private String description;

    @Column(name = "sort_order")
    private int sortOrder = 0;

    @Column(nullable = false)
    private boolean enabled = true;

    public Long getId()                  { return id; }
    public Long getCategoryId()          { return categoryId; }
    public void setCategoryId(Long v)    { this.categoryId = v; }
    public String getName()              { return name; }
    public void setName(String v)        { this.name = v; }
    public String getDescription()       { return description; }
    public void setDescription(String v) { this.description = v; }
    public int getSortOrder()            { return sortOrder; }
    public void setSortOrder(int v)      { this.sortOrder = v; }
    public boolean isEnabled()           { return enabled; }
    public void setEnabled(boolean v)    { this.enabled = v; }
}
