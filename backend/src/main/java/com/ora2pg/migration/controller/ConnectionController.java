package com.ora2pg.migration.controller;

import com.ora2pg.migration.model.ConnectionConfig;
import com.ora2pg.migration.model.ConnectionTestResult;
import com.ora2pg.migration.service.DatabaseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/connections")
@CrossOrigin(origins = "*")
public class ConnectionController {
    
    @Autowired
    private DatabaseService databaseService;
    
    @PostMapping("/test")
    public ResponseEntity<ConnectionTestResult> testConnection(@RequestBody ConnectionConfig config) {
        ConnectionTestResult result = databaseService.testConnection(config);
        return ResponseEntity.ok(result);
    }
}

