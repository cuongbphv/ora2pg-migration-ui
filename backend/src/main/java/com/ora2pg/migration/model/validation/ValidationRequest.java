package com.ora2pg.migration.model.validation;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ValidationRequest {
    private String projectId;
    private List<String> tableNames; // null or empty means all tables
    private String checksumAlgorithm; // "MD5", "SHA256", "SHA512"
    private List<String> columnsToInclude; // null or empty means all columns
    private Boolean includeDryRun;
}

