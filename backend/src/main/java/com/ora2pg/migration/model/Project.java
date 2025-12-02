package com.ora2pg.migration.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Project {
    private String id;
    private String name;
    private String description;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private ConnectionConfig sourceConnection;
    private ConnectionConfig targetConnection;
    private List<TableMapping> tableMappings;
    private String status; // "draft", "configured", "running", "completed", "error"
    
    public Project(String id, String name, String description) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        this.tableMappings = new ArrayList<>();
        this.status = "draft";
    }
}

