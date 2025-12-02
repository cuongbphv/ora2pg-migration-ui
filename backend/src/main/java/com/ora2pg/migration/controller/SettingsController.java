package com.ora2pg.migration.controller;

import com.ora2pg.migration.model.AppSettings;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/settings")
@CrossOrigin(origins = "*")
public class SettingsController {
    
    private final ConcurrentHashMap<String, AppSettings> settingsStore = new ConcurrentHashMap<>();
    private static final String DEFAULT_KEY = "default";
    
    @GetMapping
    public ResponseEntity<AppSettings> getSettings() {
        AppSettings settings = settingsStore.getOrDefault(DEFAULT_KEY, getDefaultSettings());
        return ResponseEntity.ok(settings);
    }
    
    @PutMapping
    public ResponseEntity<AppSettings> updateSettings(@RequestBody AppSettings settings) {
        settingsStore.put(DEFAULT_KEY, settings);
        return ResponseEntity.ok(settings);
    }
    
    private AppSettings getDefaultSettings() {
        AppSettings settings = new AppSettings();
        settings.setParallelJobs(4);
        settings.setBatchSize(1000);
        settings.setCommitInterval(10000);
        settings.setSmtpEnabled(false);
        settings.setLogLevel("info");
        settings.setLogRetentionDays(30);
        settings.setLogToFile(false);
        settings.setTruncateTarget(false);
        settings.setDisableConstraints(false);
        settings.setPreserveSequences(true);
        settings.setSkipErrors(false);
        settings.setMaxErrors(100);
        settings.setAutoCommit(false); // Default: manual commit for better control
        return settings;
    }
}

