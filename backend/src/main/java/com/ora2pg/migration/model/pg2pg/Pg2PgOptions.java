package com.ora2pg.migration.model.pg2pg;

import lombok.Data;

@Data
public class Pg2PgOptions {
    private boolean disable_triggers = true;
    private boolean disable_constraints = true;
}


