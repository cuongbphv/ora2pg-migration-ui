package com.ora2pg.migration.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "connection_configs")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ConnectionConfigEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @Column(nullable = false)
    private String type; // "oracle" or "postgresql"
    
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
    @JoinColumn(name = "project_id", nullable = false)
    private ProjectEntity project;
}

