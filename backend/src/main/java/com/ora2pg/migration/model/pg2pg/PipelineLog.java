package com.ora2pg.migration.model.pg2pg;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PipelineLog {
    private String id;
    private String pipelineId;
    private String executionId;
    private LocalDateTime timestamp;
    private String level; // "info", "warning", "error", "success"
    private String message;
    private String details;
    private String stepId;
}

