package com.ora2pg.migration.model.pg2pg;

import lombok.Data;

@Data
public class Pg2PgFilter {
    private boolean enabled;
    private String where_clause;
    private String description;
}


