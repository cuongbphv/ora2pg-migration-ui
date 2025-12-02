package com.ora2pg.migration.controller;

import com.ora2pg.migration.model.ConnectionConfig;
import com.ora2pg.migration.model.TableInfo;
import com.ora2pg.migration.model.TableMapping;
import com.ora2pg.migration.service.DatabaseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.sql.SQLException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/database")
@CrossOrigin(origins = "*")
public class DatabaseController {
    
    @Autowired
    private DatabaseService databaseService;
    
    @PostMapping("/discover-tables")
    public ResponseEntity<List<TableInfo>> discoverTables(
            @RequestBody Map<String, Object> request) {
        try {
            ConnectionConfig config = convertToConnectionConfig((Map<String, Object>) request.get("connection"));
            String schema = (String) request.get("schema");
            
            List<TableInfo> tables = databaseService.discoverTables(config, schema);
            return ResponseEntity.ok(tables);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    @PostMapping("/auto-map")
    public ResponseEntity<List<TableMapping>> autoMapTables(
            @RequestBody Map<String, Object> request) {
        try {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> sourceTablesData = (List<Map<String, Object>>) request.get("sourceTables");
            String targetSchema = (String) request.get("targetSchema");
            
            List<TableInfo> sourceTables = sourceTablesData.stream()
                .map(this::convertToTableInfo)
                .toList();
            
            List<TableMapping> mappings = databaseService.autoMapTables(sourceTables, targetSchema);
            return ResponseEntity.ok(mappings);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    private ConnectionConfig convertToConnectionConfig(Map<String, Object> map) {
        ConnectionConfig config = new ConnectionConfig();
        config.setType((String) map.get("type"));
        config.setHost((String) map.get("host"));
        config.setPort(((Number) map.get("port")).intValue());
        config.setDatabase((String) map.get("database"));
        config.setSchema((String) map.get("schema"));
        config.setUsername((String) map.get("username"));
        config.setPassword((String) map.get("password"));
        config.setConnectionString((String) map.get("connectionString"));
        return config;
    }
    
    private TableInfo convertToTableInfo(Map<String, Object> map) {
        TableInfo table = new TableInfo();
        table.setTableName((String) map.get("tableName"));
        table.setSchema((String) map.get("schema"));
        if (map.get("rowCount") != null) {
            table.setRowCount(((Number) map.get("rowCount")).longValue());
        }
        return table;
    }
}

