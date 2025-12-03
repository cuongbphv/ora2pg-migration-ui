package com.ora2pg.migration.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "pg2pg_column_mappings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {"pipelineStep"})
@EqualsAndHashCode(exclude = {"pipelineStep"})
public class Pg2PgColumnMappingEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @Column(nullable = false)
    private String sourceColumn;
    
    @Column(nullable = false)
    private String sourceDataType;
    
    @Column(nullable = false)
    private String targetColumn;
    
    @Column(nullable = false)
    private String targetDataType;
    
    @Column(nullable = false)
    private String transformationType; // "direct", "case-when", "subquery", "function", "static", "concat", "type-cast", "coalesce"
    
    @Column(columnDefinition = "TEXT")
    private String transformation; // SQL expression for transformation
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    @Column(nullable = false)
    private Boolean nullable = true;
    
    @Column(nullable = false)
    private Boolean isPrimaryKey = false;
    
    @Column(nullable = false)
    private Boolean isForeignKey = false;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pipeline_step_id", nullable = false)
    private PipelineStepEntity pipelineStep;
}

