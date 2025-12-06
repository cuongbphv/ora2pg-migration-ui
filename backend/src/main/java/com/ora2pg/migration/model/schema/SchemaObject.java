package com.ora2pg.migration.model.schema;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SchemaObject {
    private String name;
    private String schema;
    private String type; // "table", "index", "constraint", "sequence", "view", "function", "procedure", "trigger"
    private String status; // "pending", "generated", "applied", "error"
    private String ddl;
    private List<String> issues;
    private String sourceDdl; // Original Oracle DDL
    private String targetSchema; // Target PostgreSQL schema
    
    public SchemaObject(String name, String schema, String type) {
        this.name = name;
        this.schema = schema;
        this.type = type;
        this.status = "pending";
        this.issues = new ArrayList<>();
    }
}

