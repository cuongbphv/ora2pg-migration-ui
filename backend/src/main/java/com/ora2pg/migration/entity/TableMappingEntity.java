package com.ora2pg.migration.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "table_mappings")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TableMappingEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @Column(nullable = false)
    private String sourceTable;
    
    @Column(nullable = false)
    private String sourceSchema;
    
    @Column(nullable = false)
    private String targetTable;
    
    @Column(nullable = false)
    private String targetSchema;
    
    @Column(nullable = false)
    private Boolean enabled = true;
    
    @Column(nullable = false)
    private String status = "pending"; // "pending", "mapped", "migrated", "error"
    
    @Column(columnDefinition = "TEXT")
    private String filterCondition; // WHERE clause for filtering source data
    
    @Column(nullable = false)
    private Boolean dropBeforeInsert = false; // Drop table before migration
    
    @Column(nullable = false)
    private Boolean truncateBeforeInsert = false; // Truncate table before migration
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private ProjectEntity project;
    
    @OneToMany(mappedBy = "tableMapping", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ColumnMappingEntity> columnMappings = new ArrayList<>();
}

