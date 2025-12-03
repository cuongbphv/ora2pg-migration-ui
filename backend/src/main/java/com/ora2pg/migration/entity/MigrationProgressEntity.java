package com.ora2pg.migration.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "migration_progress")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MigrationProgressEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false, unique = true)
    private ProjectEntity project;
    
    @Column(nullable = false)
    private String status; // "idle", "running", "paused", "completed", "error"
    
    @Column(nullable = false)
    private Integer totalTables = 0;
    
    @Column(nullable = false)
    private Integer completedTables = 0;
    
    @Column(nullable = false)
    private Long totalRows = 0L;
    
    @Column(nullable = false)
    private Long migratedRows = 0L;
    
    @Column
    private String currentTable;
    
    @Column
    private LocalDateTime startTime;
    
    @Column
    private LocalDateTime endTime;
    
    @Column
    private LocalDateTime estimatedEndTime;
    
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @Column(nullable = false)
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}


