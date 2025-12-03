package com.ora2pg.migration.model.pg2pg;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PipelineExecution {
    private String id;
    private String pipelineId;
    private String status; // "running", "completed", "failed", "paused"
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private Long totalRows = 0L;
    private Long processedRows = 0L;
    private Long failedRows = 0L;
    private String errorMessage;
}

