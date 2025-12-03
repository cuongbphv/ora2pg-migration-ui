package com.ora2pg.migration.controller;

import com.ora2pg.migration.entity.PipelineEntity;
import com.ora2pg.migration.entity.PipelineExecutionEntity;
import com.ora2pg.migration.model.pg2pg.Pipeline;
import com.ora2pg.migration.model.pg2pg.PipelineExecution;
import com.ora2pg.migration.model.pg2pg.PipelineStep;
import com.ora2pg.migration.service.Pg2PgPipelineService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/pg2pg/pipelines")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class Pg2PgPipelineController {
    
    private final Pg2PgPipelineService pipelineService;
    
    @GetMapping
    public ResponseEntity<List<Pipeline>> getAllPipelines() {
        try {
            return ResponseEntity.ok(pipelineService.getAllPipelines());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<Pipeline> getPipeline(@PathVariable String id) {
        try {
            Pipeline pipeline = pipelineService.getPipelineById(id);
            return ResponseEntity.ok(pipeline);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @PostMapping
    public ResponseEntity<Pipeline> createPipeline(@RequestBody Map<String, String> request) {
        try {
            String name = request.get("name");
            String description = request.get("description");
            Pipeline pipeline = pipelineService.createPipeline(name, description);
            return ResponseEntity.status(HttpStatus.CREATED).body(pipeline);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<Pipeline> updatePipeline(@PathVariable String id, @RequestBody Pipeline pipeline) {
        try {
            if (!id.equals(pipeline.getId())) {
                return ResponseEntity.badRequest().build();
            }
            Pipeline updated = pipelineService.updatePipeline(pipeline);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePipeline(@PathVariable String id) {
        try {
            pipelineService.deletePipeline(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @PostMapping("/{pipelineId}/steps")
    public ResponseEntity<PipelineStep> addStep(
            @PathVariable String pipelineId,
            @RequestBody PipelineStep step) {
        try {
            PipelineStep created = pipelineService.addStepToPipeline(pipelineId, step);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @PutMapping("/steps/{stepId}")
    public ResponseEntity<PipelineStep> updateStep(
            @PathVariable String stepId,
            @RequestBody PipelineStep step) {
        try {
            PipelineStep updated = pipelineService.updateStep(stepId, step);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @DeleteMapping("/steps/{stepId}")
    public ResponseEntity<Void> deleteStep(@PathVariable String stepId) {
        try {
            pipelineService.deleteStep(stepId);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @PostMapping("/{pipelineId}/connections/{type}")
    public ResponseEntity<Pipeline> saveConnection(
            @PathVariable String pipelineId,
            @PathVariable String type,
            @RequestBody com.ora2pg.migration.model.ConnectionConfig connection) {
        try {
            Pipeline pipeline = pipelineService.saveConnection(pipelineId, type, connection);
            return ResponseEntity.ok(pipeline);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @PostMapping("/{pipelineId}/start")
    public ResponseEntity<PipelineExecution> startExecution(@PathVariable String pipelineId) {
        try {
            PipelineExecution execution = pipelineService.startExecution(pipelineId);
            return ResponseEntity.ok(execution);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @PostMapping("/{pipelineId}/stop")
    public ResponseEntity<Map<String, Object>> stopExecution(@PathVariable String pipelineId) {
        try {
            PipelineExecutionEntity pipeline = pipelineService.stopExecution(pipelineId);
            Map<String, Object> result = new HashMap<>();
            result.put("pipelineId", pipeline.getId());
            if (pipeline != null) {
                result.put("success", true);
            } else {
                result.put("success", false);
            }
            return ResponseEntity.ok().body(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @GetMapping("/{pipelineId}/logs")
    public ResponseEntity<List<com.ora2pg.migration.model.pg2pg.PipelineLog>> getLogs(
            @PathVariable String pipelineId,
            @RequestParam(required = false) String executionId) {
        try {
            List<com.ora2pg.migration.model.pg2pg.PipelineLog> logs = pipelineService.getLogs(pipelineId, executionId);
            return ResponseEntity.ok(logs);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @GetMapping("/{pipelineId}/executions")
    public ResponseEntity<List<com.ora2pg.migration.model.pg2pg.PipelineExecution>> getExecutions(@PathVariable String pipelineId) {
        try {
            List<com.ora2pg.migration.model.pg2pg.PipelineExecution> executions = pipelineService.getExecutions(pipelineId);
            return ResponseEntity.ok(executions);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}

