package com.ora2pg.migration.model.schema;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
@AllArgsConstructor
public class ConstraintInfo {
    private String constraintName;
    private String tableName;
    private String tableSchema;
    private String constraintType; // "PRIMARY KEY", "FOREIGN KEY", "UNIQUE", "CHECK", "NOT NULL"
    private List<String> columns; // Column names
    private String referencedTable; // For foreign keys
    private String referencedSchema; // For foreign keys
    private List<String> referencedColumns; // For foreign keys
    private String checkCondition; // For check constraints
    private String deleteRule; // "CASCADE", "SET NULL", "RESTRICT", "NO ACTION"
    private String updateRule; // "CASCADE", "SET NULL", "RESTRICT", "NO ACTION"
    private String status; // "ENABLED", "DISABLED"
    
    public ConstraintInfo() {
        this.columns = new ArrayList<>();
        this.referencedColumns = new ArrayList<>();
    }
}

