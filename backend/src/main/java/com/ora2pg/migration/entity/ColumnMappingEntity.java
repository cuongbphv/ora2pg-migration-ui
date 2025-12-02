package com.ora2pg.migration.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "column_mappings")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ColumnMappingEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @Column(nullable = false)
    private String sourceColumn;
    
    @Column(nullable = false)
    private String sourceDataType;
    
    @Column
    private Integer sourceDataLength;
    
    @Column
    private Integer sourceDataPrecision;
    
    @Column
    private Integer sourceDataScale;
    
    @Column(nullable = false)
    private String targetColumn;
    
    @Column(nullable = false)
    private String targetDataType;
    
    @Column
    private Integer targetDataLength;
    
    @Column
    private Integer targetDataPrecision;
    
    @Column
    private Integer targetDataScale;
    
    @Column(columnDefinition = "TEXT")
    private String transformation;
    
    @Column(nullable = false)
    private Boolean nullable = true;
    
    @Column(nullable = false)
    private Boolean isPrimaryKey = false;
    
    @Column(nullable = false)
    private Boolean isForeignKey = false;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "table_mapping_id", nullable = false)
    private TableMappingEntity tableMapping;
}

