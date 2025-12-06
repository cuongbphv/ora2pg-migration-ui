package com.ora2pg.migration.model.schema;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SchemaMigrationRequest {
    private String projectId;
    private String targetSchema;
    private Boolean includeIndexes;
    private Boolean includeConstraints;
    private Boolean includeSequences;
    private Boolean includeViews;
    private Boolean includeFunctions;
    private Boolean includeProcedures;
    private Boolean includeTriggers;
    private List<String> tableNames; // Optional: specific tables only
}

