package com.ora2pg.migration.controller;

import com.ora2pg.migration.model.DataTypeMappingRule;
import com.ora2pg.migration.service.DataTypeMappingRuleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/data-type-rules")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class DataTypeMappingRuleController {
    
    private final DataTypeMappingRuleService service;
    
    @GetMapping
    public ResponseEntity<List<DataTypeMappingRule>> getAllRules() {
        try {
            return ResponseEntity.ok(service.getAllRules());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @GetMapping("/custom")
    public ResponseEntity<List<DataTypeMappingRule>> getCustomRules() {
        try {
            return ResponseEntity.ok(service.getCustomRules());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @GetMapping("/defaults")
    public ResponseEntity<List<DataTypeMappingRule>> getDefaultRules() {
        try {
            return ResponseEntity.ok(service.getDefaultRules());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @PostMapping
    public ResponseEntity<DataTypeMappingRule> createRule(@RequestBody DataTypeMappingRule rule) {
        try {
            DataTypeMappingRule created = service.createRule(rule);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<DataTypeMappingRule> updateRule(
            @PathVariable String id,
            @RequestBody DataTypeMappingRule rule) {
        try {
            DataTypeMappingRule updated = service.updateRule(id, rule);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRule(@PathVariable String id) {
        try {
            service.deleteRule(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}

