package com.ora2pg.migration.model.pg2pg;

import lombok.Data;

@Data
public class Pg2PgConstraint {
    private String name;
    private String definition;
}


