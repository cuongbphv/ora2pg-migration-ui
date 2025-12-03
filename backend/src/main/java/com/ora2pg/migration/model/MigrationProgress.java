package com.ora2pg.migration.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MigrationProgress {
    private String projectId;
    private Integer totalTables;
    private Integer completedTables;
    private Long totalRows;
    private Long migratedRows;
    private String currentTable;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private LocalDateTime estimatedEndTime;
    private String status; // "idle", "running", "paused", "completed", "error"
    private List<MigrationLog> logs;
    
    public MigrationProgress(String projectId) {
        this.projectId = projectId;
        this.totalTables = 0;
        this.completedTables = 0;
        this.totalRows = 0L;
        this.migratedRows = 0L;
        this.status = "idle";
        this.logs = new ArrayList<>();
    }
}

