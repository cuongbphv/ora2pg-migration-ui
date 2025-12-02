package com.ora2pg.migration.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MigrationLog {
    private String id;
    private LocalDateTime timestamp;
    private String level; // "info", "warning", "error", "success"
    private String message;
    private String details;
}

