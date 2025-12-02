package com.ora2pg.migration.controller;

import com.ora2pg.migration.model.AppSettings;
import com.ora2pg.migration.model.MigrationProgress;
import com.ora2pg.migration.model.Project;
import com.ora2pg.migration.service.MigrationService;
import com.ora2pg.migration.service.ProjectService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/migration")
@CrossOrigin(origins = "*")
public class MigrationController {
    
    @Autowired
    private MigrationService migrationService;
    
    @Autowired
    private ProjectService projectService;
    
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
}

