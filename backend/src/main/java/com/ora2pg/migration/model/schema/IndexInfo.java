package com.ora2pg.migration.model.schema;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
@AllArgsConstructor
public class IndexInfo {
    private String indexName;
    private String tableName;
    private String tableSchema;
    private String indexType; // "NORMAL", "UNIQUE", "BITMAP", "FUNCTION-BASED"
    private boolean unique;
    private List<String> columns; // Column names in order
    private List<String> expressions; // For function-based indexes
    private String tablespace;
    private String status; // "VALID", "UNUSABLE"
    
    public IndexInfo() {
        this.columns = new ArrayList<>();
        this.expressions = new ArrayList<>();
    }
}

