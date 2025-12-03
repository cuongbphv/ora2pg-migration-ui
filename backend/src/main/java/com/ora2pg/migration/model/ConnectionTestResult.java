package com.ora2pg.migration.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ConnectionTestResult {
    private Boolean success;
    private String message;
    private String databaseVersion;
    private Long connectionTimeMs;
    private String connectionString;
    private Boolean isConnected;
}

