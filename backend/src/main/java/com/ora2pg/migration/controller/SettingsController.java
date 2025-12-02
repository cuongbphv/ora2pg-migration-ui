package com.ora2pg.migration.controller;

import com.ora2pg.migration.model.AppSettings;
import com.ora2pg.migration.service.SettingsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/settings")
@CrossOrigin(origins = "*")
public class SettingsController {
    
    @Autowired
    private SettingsService settingsService;
    
    @GetMapping
    public ResponseEntity<AppSettings> getSettings() {
        AppSettings settings = settingsService.getSettings();
        return ResponseEntity.ok(settings);
    }
    
    @PutMapping
    public ResponseEntity<AppSettings> updateSettings(@RequestBody AppSettings settings) {
        AppSettings updated = settingsService.updateSettings(settings);
        return ResponseEntity.ok(updated);
    }
}

