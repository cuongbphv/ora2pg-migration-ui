package com.ora2pg.migration.model.pg2pg;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PipelineStep {
    private String id;
    private Integer order;
    private String sourceSchema;
    private String sourceTable;
    private String targetSchema;
    private String targetTable;
    private String description;
    private String status; // "draft", "configured", "executing", "completed", "error"
    
    // Filter
    private Boolean filterEnabled = false;
    private String filterWhereClause;
    private String filterDescription;
    
    // Options
    private Boolean disableTriggers = false;
    private Boolean disableConstraints = false;
    
    private String pipelineId;
    private List<Pg2PgColumnMapping> columnMappings = new ArrayList<>();
}

