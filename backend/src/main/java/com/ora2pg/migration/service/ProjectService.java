package com.ora2pg.migration.service;

import com.ora2pg.migration.entity.ProjectEntity;
import com.ora2pg.migration.entity.TableMappingEntity;
import com.ora2pg.migration.entity.User;
import com.ora2pg.migration.mapper.ProjectMapper;
import com.ora2pg.migration.model.Project;
import com.ora2pg.migration.repository.ProjectRepository;
import com.ora2pg.migration.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ProjectService {
    
    @Autowired
    private ProjectRepository projectRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private ProjectMapper projectMapper;
    
    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null) {
            throw new RuntimeException("User not authenticated");
        }
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
    
    public List<Project> getAllProjects() {
        User user = getCurrentUser();
        return projectRepository.findByUser(user).stream()
                .map(projectMapper::toModel)
                .collect(Collectors.toList());
    }
    
    public Project getProjectById(String id) {
        User user = getCurrentUser();
        ProjectEntity entity = projectRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Project not found: " + id));
        
        // Verify ownership
        if (!entity.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Access denied");
        }
        
        return projectMapper.toModel(entity);
    }
    
    @Transactional
    public Project createProject(String name, String description) {
        User user = getCurrentUser();
        Project project = new Project();
        project.setName(name);
        project.setDescription(description);
        project.setStatus("draft");
        
        ProjectEntity entity = projectMapper.toEntity(project, user);
        entity = projectRepository.save(entity);
        return projectMapper.toModel(entity);
    }
    
    @Transactional
    public Project updateProject(Project project) {
        User user = getCurrentUser();
        ProjectEntity entity = projectRepository.findById(project.getId())
                .orElseThrow(() -> new IllegalArgumentException("Project not found: " + project.getId()));
        
        // Verify ownership
        if (!entity.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Access denied");
        }
        
        entity.setName(project.getName());
        entity.setDescription(project.getDescription());
        entity.setStatus(project.getStatus() != null ? project.getStatus() : entity.getStatus());
        
        entity = projectRepository.save(entity);
        return projectMapper.toModel(entity);
    }
    
    @Transactional
    public void deleteProject(String id) {
        User user = getCurrentUser();
        ProjectEntity entity = projectRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Project not found: " + id));
        
        // Verify ownership
        if (!entity.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Access denied");
        }
        
        projectRepository.delete(entity);
    }
    
    @Transactional
    public Project saveConnection(String projectId, String type, com.ora2pg.migration.model.ConnectionConfig connection) {
        User user = getCurrentUser();
        ProjectEntity entity = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found: " + projectId));
        
        // Verify ownership
        if (!entity.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Access denied");
        }
        
        // Remove existing connection of this type
        entity.getConnections().removeIf(c -> type.equalsIgnoreCase(c.getConnectionType()));
        
        // Add new connection
        com.ora2pg.migration.entity.ConnectionConfigEntity connEntity = 
                projectMapper.toConnectionConfigEntity(connection, type);
        connEntity.setProject(entity);
        entity.getConnections().add(connEntity);
        
        // Update status
        if (entity.getConnections().stream().anyMatch(c -> "source".equals(c.getConnectionType())) &&
            entity.getConnections().stream().anyMatch(c -> "target".equals(c.getConnectionType()))) {
            entity.setStatus("configured");
        }
        
        entity = projectRepository.save(entity);
        return projectMapper.toModel(entity);
    }
    
    @Transactional
    public Project saveTableMappings(String projectId, List<com.ora2pg.migration.model.TableMapping> tableMappings) {
        User user = getCurrentUser();
        ProjectEntity entity = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found: " + projectId));
        
        // Verify ownership
        if (!entity.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Access denied");
        }
        
        // Clear existing mappings
        entity.getTableMappings().clear();
        
        // Add new mappings
        ProjectEntity finalEntity = entity;
        tableMappings.forEach(tm -> {
            TableMappingEntity tmEntity = projectMapper.toTableMappingEntity(tm, finalEntity);
            finalEntity.getTableMappings().add(tmEntity);
        });
        
        entity = projectRepository.save(entity);
        return projectMapper.toModel(entity);
    }
}

