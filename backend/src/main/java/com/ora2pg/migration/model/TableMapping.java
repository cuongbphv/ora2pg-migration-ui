package com.ora2pg.migration.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TableMapping {
    private String id;
    private String sourceTable;
    private String sourceSchema;
    private String targetTable;
    private String targetSchema;
    private Boolean enabled;
    private List<ColumnMapping> columnMappings;
    private String status; // "pending", "mapped", "migrated", "error"
    private String filterCondition; // WHERE clause for filtering source data
    private Boolean dropBeforeInsert; // Drop table before migration
    private Boolean truncateBeforeInsert; // Truncate table before migration
    private String partitionColumn; // Column to partition data
    private Integer chunkSize; // Rows per chunk
    private Integer chunkWorkers; // Workers per table
    private String partitionMinValue; // Optional min bound
    private String partitionMaxValue; // Optional max bound
    
    public TableMapping(String id, String sourceTable, String sourceSchema, String targetTable, String targetSchema) {
        this.id = id;
        this.sourceTable = sourceTable;
        this.sourceSchema = sourceSchema;
        this.targetTable = targetTable;
        this.targetSchema = targetSchema;
        this.enabled = true;
        this.columnMappings = new ArrayList<>();
        this.status = "pending";
    }
}

