package com.ora2pg.migration.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "pg2pg_pipeline_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {"pipeline", "execution"})
@EqualsAndHashCode(exclude = {"pipeline", "execution"})
public class PipelineLogEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pipeline_id", nullable = false)
    private PipelineEntity pipeline;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "execution_id")
    private PipelineExecutionEntity execution;
    
    @Column(nullable = false)
    private LocalDateTime timestamp;
    
    @Column(nullable = false)
    private String level; // "info", "warning", "error", "success"
    
    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;
    
    @Column(columnDefinition = "TEXT")
    private String details;
    
    @Column
    private String stepId; // Optional: which step this log belongs to
}

