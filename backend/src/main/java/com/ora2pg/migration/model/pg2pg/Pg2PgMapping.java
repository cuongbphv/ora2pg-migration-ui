package com.ora2pg.migration.model.pg2pg;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class Pg2PgMapping {
    @JsonProperty("source_table")
    private String source_table;
    
    @JsonProperty("source_schema")
    private String source_schema;
    
    @JsonProperty("target_table")
    private String target_table;
    
    @JsonProperty("target_schema")
    private String target_schema;
    
    private String description;

    private Pg2PgOptions options;
    
    @JsonProperty("column_mappings")
    private Map<String, Pg2PgColumnMappingJson> column_mappings;
    
    private Pg2PgFilter filter;
    private List<Pg2PgIndex> indexes;
    private List<Pg2PgConstraint> constraints;
    
    @JsonProperty("post_processing_sql")
    private List<String> post_processing_sql;
}


