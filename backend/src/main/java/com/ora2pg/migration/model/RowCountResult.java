package com.ora2pg.migration.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RowCountResult {
    private String table;
    private String sourceSchema;
    private String targetSchema;
    private Long sourceCount;
    private Long targetCount;
    private Boolean match;
    private Long difference;
    private String status; // "match", "mismatch", "error"
    private String errorMessage;
}

