package com.ora2pg.migration.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "settings", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"param_key", "param_tab"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SettingEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @Column(name = "param_key", nullable = false)
    private String paramKey;
    
    @Column(name = "param_value", columnDefinition = "TEXT")
    private String paramValue;
    
    @Column(name = "param_tab", nullable = false)
    private String paramTab; // "performance", "smtp", "logging", "migration", etc.
    
    @Column(name = "param_type")
    private String paramType; // "string", "number", "boolean", "json", etc.
    
    @Column(columnDefinition = "TEXT")
    private String description;
}

