package com.ora2pg.migration.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "pg2pg_pipeline_executions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {"pipeline"})
@EqualsAndHashCode(exclude = {"pipeline"})
public class PipelineExecutionEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pipeline_id", nullable = false)
    private PipelineEntity pipeline;
    
    @Column(nullable = false)
    private String status; // "running", "completed", "failed", "paused"
    
    @Column(nullable = false)
    private LocalDateTime startTime;
    
    @Column
    private LocalDateTime endTime;
    
    @Column(nullable = false)
    private Long totalRows = 0L;
    
    @Column(nullable = false)
    private Long processedRows = 0L;
    
    @Column(nullable = false)
    private Long failedRows = 0L;
    
    @Column(columnDefinition = "TEXT")
    private String errorMessage;
}

