package com.ora2pg.migration.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "data_type_mapping_rules", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"oracle_type", "user_id"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DataTypeMappingRuleEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String oracleType;

    @Column(nullable = false)
    private String postgresType;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String transformationHint;

    @Column(nullable = false)
    private Boolean isCustom = true; // true for user-created, false for system defaults

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = true) // null for system defaults
    private User user;

    @PrePersist
    protected void onCreate() {
        if (isCustom == null) {
            isCustom = true;
        }
    }
}

