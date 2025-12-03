package com.ora2pg.migration.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "pg2pg_pipeline_connections")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {"pipeline"})
@EqualsAndHashCode(exclude = {"pipeline"})
public class PipelineConnectionEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @Column(nullable = false)
    private String type; // "postgresql"
    
    @Column(nullable = false)
    private String host;
    
    @Column(nullable = false)
    private Integer port;
    
    @Column(nullable = false)
    private String database;
    
    private String schema;
    
    @Column(nullable = false)
    private String username;
    
    @Column(nullable = false)
    private String password; // Encrypted
    
    private String connectionString;
    
    private Boolean isConnected = false;
    
    @Column(nullable = false)
    private String connectionType; // "source" or "target"
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pipeline_id", nullable = false)
    private PipelineEntity pipeline;
}

