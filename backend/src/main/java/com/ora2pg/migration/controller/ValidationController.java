package com.ora2pg.migration.controller;

import com.ora2pg.migration.model.*;
import com.ora2pg.migration.model.validation.ChecksumResult;
import com.ora2pg.migration.model.validation.DryRunResult;
import com.ora2pg.migration.model.validation.ValidationRequest;
import com.ora2pg.migration.service.DataValidationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/validation")
@CrossOrigin(origins = "*")
public class ValidationController {
    
    @Autowired
    private DataValidationService validationService;
    
    /**
     * Compare row counts between source and target tables
     */
    @PostMapping("/row-count/{projectId}")
    public ResponseEntity<List<RowCountResult>> compareRowCounts(
            @PathVariable String projectId,
            @RequestBody(required = false) Map<String, Object> request) {
        try {
            List<String> tableNames = null;
            if (request != null && request.containsKey("tableNames")) {
                @SuppressWarnings("unchecked")
                List<String> tables = (List<String>) request.get("tableNames");
                tableNames = tables;
            }
            
            List<RowCountResult> results = validationService.compareRowCounts(projectId, tableNames);
            return ResponseEntity.ok(results);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Compare checksums between source and target tables
     */
    @PostMapping("/checksum/{projectId}")
    public ResponseEntity<List<ChecksumResult>> compareChecksums(
            @PathVariable String projectId,
            @RequestBody(required = false) Map<String, Object> request) {
        try {
            List<String> tableNames = null;
            String algorithm = "MD5";
            List<String> columnsToInclude = null;
            
            if (request != null) {
                if (request.containsKey("tableNames")) {
                    @SuppressWarnings("unchecked")
                    List<String> tables = (List<String>) request.get("tableNames");
                    tableNames = tables;
                }
                if (request.containsKey("algorithm")) {
                    algorithm = (String) request.get("algorithm");
                }
                if (request.containsKey("columnsToInclude")) {
                    @SuppressWarnings("unchecked")
                    List<String> columns = (List<String>) request.get("columnsToInclude");
                    columnsToInclude = columns;
                }
            }
            
            List<ChecksumResult> results = validationService.compareChecksums(
                projectId, tableNames, algorithm, columnsToInclude);
            return ResponseEntity.ok(results);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Perform dry-run simulation
     */
    @PostMapping("/dry-run/{projectId}")
    public ResponseEntity<List<DryRunResult>> performDryRun(
            @PathVariable String projectId,
            @RequestBody(required = false) Map<String, Object> request) {
        try {
            List<String> tableNames = null;
            if (request != null && request.containsKey("tableNames")) {
                @SuppressWarnings("unchecked")
                List<String> tables = (List<String>) request.get("tableNames");
                tableNames = tables;
            }
            
            List<DryRunResult> results = validationService.performDryRun(projectId, tableNames);
            return ResponseEntity.ok(results);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Run all validations
     */
    @PostMapping("/all/{projectId}")
    public ResponseEntity<Map<String, Object>> runAllValidations(
            @PathVariable String projectId,
            @RequestBody(required = false) ValidationRequest request) {
        try {
            List<String> tableNames = null;
            String algorithm = "MD5";
            List<String> columnsToInclude = null;
            
            if (request != null) {
                tableNames = request.getTableNames();
                algorithm = request.getChecksumAlgorithm() != null ? request.getChecksumAlgorithm() : "MD5";
                columnsToInclude = request.getColumnsToInclude();
            }
            
            List<RowCountResult> rowCountResults = validationService.compareRowCounts(projectId, tableNames);
            List<ChecksumResult> checksumResults = validationService.compareChecksums(
                projectId, tableNames, algorithm, columnsToInclude);
            
            List<DryRunResult> dryRunResults = null;
            if (request == null || request.getIncludeDryRun() == null || request.getIncludeDryRun()) {
                dryRunResults = validationService.performDryRun(projectId, tableNames);
            }
            
            return ResponseEntity.ok(Map.of(
                "rowCount", rowCountResults,
                "checksum", checksumResults,
                "dryRun", dryRunResults != null ? dryRunResults : List.of()
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}

