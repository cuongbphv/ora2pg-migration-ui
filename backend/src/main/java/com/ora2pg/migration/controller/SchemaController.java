package com.ora2pg.migration.controller;

import com.ora2pg.migration.model.schema.SchemaMigrationRequest;
import com.ora2pg.migration.model.schema.SchemaObject;
import com.ora2pg.migration.service.SchemaMigrationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/schema")
@CrossOrigin(origins = "*")
public class SchemaController {
    
    @Autowired
    private SchemaMigrationService schemaMigrationService;
    
    /**
     * Generate DDL for schema objects
     */
    @PostMapping("/generate-ddl")
    public ResponseEntity<List<SchemaObject>> generateDDL(@RequestBody SchemaMigrationRequest request) {
        try {
            List<SchemaObject> objects = schemaMigrationService.generateSchemaDDL(request);
            return ResponseEntity.ok(objects);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Get all DDL as a single SQL script
     */
    @PostMapping("/generate-ddl/all")
    public ResponseEntity<Map<String, Object>> generateAllDDL(@RequestBody SchemaMigrationRequest request) {
        try {
            List<SchemaObject> objects = schemaMigrationService.generateSchemaDDL(request);
            
            // Filter by include flags
            List<SchemaObject> filtered = objects.stream()
                .filter(obj -> {
                    if ("index".equals(obj.getType()) && 
                        (request.getIncludeIndexes() == null || !request.getIncludeIndexes())) {
                        return false;
                    }
                    if ("constraint".equals(obj.getType()) && 
                        (request.getIncludeConstraints() == null || !request.getIncludeConstraints())) {
                        return false;
                    }
                    if ("sequence".equals(obj.getType()) && 
                        (request.getIncludeSequences() == null || !request.getIncludeSequences())) {
                        return false;
                    }
                    if ("view".equals(obj.getType()) && 
                        (request.getIncludeViews() == null || !request.getIncludeViews())) {
                        return false;
                    }
                    return true;
                })
                .collect(java.util.stream.Collectors.toList());
            
            // Combine all DDL
            String allDDL = filtered.stream()
                .map(SchemaObject::getDdl)
                .filter(ddl -> ddl != null && !ddl.isEmpty())
                .collect(java.util.stream.Collectors.joining("\n\n"));
            
            return ResponseEntity.ok(Map.of(
                "objects", filtered,
                "allDDL", allDDL,
                "count", filtered.size()
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}

