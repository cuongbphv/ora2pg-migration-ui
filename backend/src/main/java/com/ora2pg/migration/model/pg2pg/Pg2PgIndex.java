package com.ora2pg.migration.model.pg2pg;

import lombok.Data;

import java.util.List;

@Data
public class Pg2PgIndex {
    private String name;
    private String type;
    private List<String> columns;
}


