package com.ora2pg.migration.controller;

import com.ora2pg.migration.model.Project;
import com.ora2pg.migration.model.TableMapping;
import com.ora2pg.migration.service.ProjectService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/projects")
@CrossOrigin(origins = "*")
public class ProjectController {
    
    @Autowired
    private ProjectService projectService;
    
    @GetMapping
    public ResponseEntity<List<Project>> getAllProjects() {
        return ResponseEntity.ok(projectService.getAllProjects());
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<Project> getProject(@PathVariable String id) {
        Project project = projectService.getProjectById(id);
        if (project == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(project);
    }
    
    @PostMapping
    public ResponseEntity<Project> createProject(@RequestBody Map<String, String> request) {
        String name = request.get("name");
        String description = request.get("description");
        Project project = projectService.createProject(name, description);
        return ResponseEntity.status(HttpStatus.CREATED).body(project);
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<Project> updateProject(@PathVariable String id, @RequestBody Project project) {
        if (!id.equals(project.getId())) {
            return ResponseEntity.badRequest().build();
        }
        Project updated = projectService.updateProject(project);
        return ResponseEntity.ok(updated);
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProject(@PathVariable String id) {
        projectService.deleteProject(id);
        return ResponseEntity.noContent().build();
    }
    
    @PostMapping("/{id}/connections/{type}")
    public ResponseEntity<Project> saveConnection(
            @PathVariable String id,
            @PathVariable String type,
            @RequestBody com.ora2pg.migration.model.ConnectionConfig connection) {
        try {
            Project project = projectService.saveConnection(id, type, connection);
            return ResponseEntity.ok(project);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    @PutMapping("/{id}/table-mappings")
    public ResponseEntity<Project> saveTableMappings(
            @PathVariable String id,
            @RequestBody List<TableMapping> tableMappings) {
        try {
            Project project = projectService.saveTableMappings(id, tableMappings);
            return ResponseEntity.ok(project);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }
}

