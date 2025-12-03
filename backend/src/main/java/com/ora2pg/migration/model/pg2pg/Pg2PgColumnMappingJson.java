package com.ora2pg.migration.model.pg2pg;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

/**
 * DTO for JSON column mapping structure
 * Matches the JSON format with snake_case field names
 */
@Data
public class Pg2PgColumnMappingJson {
    @JsonProperty("target_column")
    private String target_column;
    
    @JsonProperty("target_type")
    private String target_type;
    
    private String transformation;
    private String description;
}

