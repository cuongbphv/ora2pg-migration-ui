package com.ora2pg.migration.model.pg2pg;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class Pg2PgFilter {
    private boolean enabled;
    
    @JsonProperty("where_clause")
    private String where_clause;
    
    private String description;
}


