package com.ora2pg.migration.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "pg2pg_pipeline_steps")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {"pipeline", "columnMappings"})
@EqualsAndHashCode(exclude = {"pipeline", "columnMappings"})
public class PipelineStepEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @Column(nullable = false)
    private Integer stepOrder;
    
    @Column(nullable = false)
    private String sourceSchema;
    
    @Column(nullable = false)
    private String sourceTable;
    
    @Column(nullable = false)
    private String targetSchema;
    
    @Column(nullable = false)
    private String targetTable;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    @Column(nullable = false)
    private String status = "draft"; // "draft", "configured", "executing", "completed", "error"
    
    // Filter configuration
    @Column(nullable = false)
    private Boolean filterEnabled = false;
    
    @Column(columnDefinition = "TEXT")
    private String filterWhereClause;
    
    @Column(columnDefinition = "TEXT")
    private String filterDescription;
    
    // Options
    @Column(nullable = false)
    private Boolean disableTriggers = false;
    
    @Column(nullable = false)
    private Boolean disableConstraints = false;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pipeline_id", nullable = false)
    private PipelineEntity pipeline;
    
    @OneToMany(mappedBy = "pipelineStep", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Pg2PgColumnMappingEntity> columnMappings = new ArrayList<>();
}

