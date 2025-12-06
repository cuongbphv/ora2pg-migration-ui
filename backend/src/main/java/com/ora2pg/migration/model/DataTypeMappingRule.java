package com.ora2pg.migration.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DataTypeMappingRule {
    private String id;
    private String oracleType;
    private String postgresType;
    private String description;
    private String transformationHint;
    private Boolean isCustom;
}



