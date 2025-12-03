package com.ora2pg.migration.controller;

import com.ora2pg.migration.model.AppSettings;
import com.ora2pg.migration.model.MigrationProgress;
import com.ora2pg.migration.model.Project;
import com.ora2pg.migration.service.MigrationLogExportService;
import com.ora2pg.migration.service.MigrationService;
import com.ora2pg.migration.service.ProjectService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/migration")
@CrossOrigin(origins = "*")
public class MigrationController {
    
    @Autowired
    private MigrationService migrationService;
    
    @Autowired
    private ProjectService projectService;
    
    @Autowired
    private MigrationLogExportService exportService;
    
    @PostMapping("/start/{projectId}")
    public ResponseEntity<MigrationProgress> startMigration(
            @PathVariable String projectId,
            @RequestBody(required = false) AppSettings settings) {
        Project project = projectService.getProjectById(projectId);
        if (project == null) {
            return ResponseEntity.notFound().build();
        }
        
        if (settings == null) {
            settings = new AppSettings();
            settings.setBatchSize(1000);
            settings.setCommitInterval(10000);
            settings.setParallelJobs(4);
        }
        
        MigrationProgress progress = migrationService.startMigration(project, settings);
        return ResponseEntity.ok(progress);
    }
    
    @GetMapping("/progress/{projectId}")
    public ResponseEntity<MigrationProgress> getProgress(@PathVariable String projectId) {
        MigrationProgress progress = migrationService.getProgress(projectId);
        return ResponseEntity.ok(progress);
    }
    
    @PostMapping("/pause/{projectId}")
    public ResponseEntity<MigrationProgress> pauseMigration(@PathVariable String projectId) {
        migrationService.pauseMigration(projectId);
        MigrationProgress progress = migrationService.getProgress(projectId);
        return ResponseEntity.ok(progress);
    }
    
    @PostMapping("/resume/{projectId}")
    public ResponseEntity<MigrationProgress> resumeMigration(@PathVariable String projectId) {
        migrationService.resumeMigration(projectId);
        MigrationProgress progress = migrationService.getProgress(projectId);
        return ResponseEntity.ok(progress);
    }
    
    /**
     * Export migration logs to CSV
     */
    @GetMapping("/logs/{projectId}/export/csv")
    public ResponseEntity<byte[]> exportLogsToCsv(@PathVariable String projectId) {
        try {
            byte[] csvData = exportService.exportToCsv(projectId);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType("text/csv; charset=UTF-8"));
            headers.setContentDispositionFormData("attachment", "migration_logs_" + projectId + ".csv");
            headers.setContentLength(csvData.length);
            
            return ResponseEntity.ok()
                    .headers(headers)
                    .body(csvData);
        } catch (IOException e) {
            return ResponseEntity.status(500).build();
        }
    }
    
    /**
     * Export migration logs to Excel
     */
    @GetMapping("/logs/{projectId}/export/excel")
    public ResponseEntity<byte[]> exportLogsToExcel(@PathVariable String projectId) {
        try {
            byte[] excelData = exportService.exportToExcel(projectId);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
            headers.setContentDispositionFormData("attachment", "migration_logs_" + projectId + ".xlsx");
            headers.setContentLength(excelData.length);
            
            return ResponseEntity.ok()
                    .headers(headers)
                    .body(excelData);
        } catch (IOException e) {
            return ResponseEntity.status(500).build();
        }
    }
}

