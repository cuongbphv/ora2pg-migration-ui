package com.ora2pg.migration.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppSettings {
    // Performance
    private Integer parallelJobs;
    private Integer batchSize;
    private Integer commitInterval;
    
    // SMTP Configuration
    private Boolean smtpEnabled;
    private String smtpHost;
    private Integer smtpPort;
    private String smtpUser;
    private String smtpPassword;
    private String smtpFromEmail;
    private Boolean notifyOnComplete;
    private Boolean notifyOnError;
    
    // Logging
    private String logLevel; // "debug", "info", "warning", "error"
    private Integer logRetentionDays;
    private Boolean logToFile;
    private String logFilePath;
    
    // Migration
    private Boolean truncateTarget;
    private Boolean disableConstraints;
    private Boolean preserveSequences;
    private Boolean skipErrors;
    private Integer maxErrors;
    private Boolean autoCommit; // Control auto-commit mode for target database
    
    // Table Discovery
    private String tableNameFilter; // SQL LIKE pattern for filtering tables (e.g., "TRADE_%")
}

