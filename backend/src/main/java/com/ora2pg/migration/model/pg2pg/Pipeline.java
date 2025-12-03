package com.ora2pg.migration.model.pg2pg;

import com.ora2pg.migration.model.ConnectionConfig;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Pipeline {
    private String id;
    private String name;
    private String description;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String status; // "draft", "configured", "running", "completed", "error"
    private String userId;
    private List<PipelineStep> steps = new ArrayList<>();
    private ConnectionConfig sourceConnection;
    private ConnectionConfig targetConnection;
    private Integer totalRuns = 0;
    private LocalDateTime lastRunAt;
}

