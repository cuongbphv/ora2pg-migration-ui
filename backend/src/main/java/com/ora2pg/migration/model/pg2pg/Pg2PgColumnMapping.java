package com.ora2pg.migration.model.pg2pg;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Pg2PgColumnMapping {
    private String id;
    private String sourceColumn;
    private String sourceDataType;
    private String targetColumn;
    private String targetDataType;
    private String transformationType; // "direct", "case-when", "subquery", "function", "static", "concat", "type-cast", "coalesce"
    private String transformation; // SQL expression
    private String description;
    private Boolean nullable = true;
    private Boolean isPrimaryKey = false;
    private Boolean isForeignKey = false;
    private String pipelineStepId;
}
