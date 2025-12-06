package com.ora2pg.migration.model.validation;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DryRunResult {
    private String table;
    private String sourceSchema;
    private String targetSchema;
    private Long rowCount;
    private String estimatedSize; // e.g., "45 MB"
    private String estimatedTime; // e.g., "2m 30s"
    private List<String> issues;
    private String ddlPreview;
    private String status; // "ready", "warning", "error"
    private String errorMessage;
    
    public DryRunResult(String table, String sourceSchema, String targetSchema) {
        this.table = table;
        this.sourceSchema = sourceSchema;
        this.targetSchema = targetSchema;
        this.issues = new ArrayList<>();
        this.status = "ready";
    }
}

