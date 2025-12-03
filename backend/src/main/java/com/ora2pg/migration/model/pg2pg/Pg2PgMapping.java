package com.ora2pg.migration.model.pg2pg;

import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class Pg2PgMapping {
    private String source_table;
    private String source_schema;
    private String target_table;
    private String target_schema;
    private String description;

    private Pg2PgOptions options;
    private Map<String, Pg2PgColumnMapping> column_mappings;
    private Pg2PgFilter filter;
    private List<Pg2PgIndex> indexes;
    private List<Pg2PgConstraint> constraints;
    private List<String> post_processing_sql;
}


