package com.ora2pg.migration.mapper;

import com.ora2pg.migration.entity.*;
import com.ora2pg.migration.model.*;
import org.springframework.stereotype.Component;

import java.util.stream.Collectors;

@Component
public class ProjectMapper {
    
    public Project toModel(ProjectEntity entity) {
        Project project = new Project();
        project.setId(entity.getId());
        project.setName(entity.getName());
        project.setDescription(entity.getDescription());
        project.setCreatedAt(entity.getCreatedAt());
        project.setUpdatedAt(entity.getUpdatedAt());
        project.setStatus(entity.getStatus());
        
        // Map connections
        if (entity.getConnections() != null) {
            entity.getConnections().forEach(conn -> {
                ConnectionConfig config = toConnectionConfig(conn);
                if ("source".equals(conn.getConnectionType())) {
                    project.setSourceConnection(config);
                } else if ("target".equals(conn.getConnectionType())) {
                    project.setTargetConnection(config);
                }
            });
        }
        
        // Map table mappings
        if (entity.getTableMappings() != null) {
            project.setTableMappings(
                entity.getTableMappings().stream()
                    .map(this::toTableMapping)
                    .collect(Collectors.toList())
            );
        }
        
        return project;
    }
    
    public ProjectEntity toEntity(Project model, User user) {
        ProjectEntity entity = new ProjectEntity();
        if (model.getId() != null) {
            entity.setId(model.getId());
        }
        entity.setName(model.getName());
        entity.setDescription(model.getDescription());
        entity.setStatus(model.getStatus() != null ? model.getStatus() : "draft");
        entity.setUser(user);
        
        // Map connections
        if (model.getSourceConnection() != null) {
            ConnectionConfigEntity sourceConn = toConnectionConfigEntity(model.getSourceConnection(), "source");
            sourceConn.setProject(entity);
            entity.getConnections().add(sourceConn);
        }
        if (model.getTargetConnection() != null) {
            ConnectionConfigEntity targetConn = toConnectionConfigEntity(model.getTargetConnection(), "target");
            targetConn.setProject(entity);
            entity.getConnections().add(targetConn);
        }
        
        // Map table mappings
        if (model.getTableMappings() != null) {
            entity.setTableMappings(
                model.getTableMappings().stream()
                    .map(tm -> toTableMappingEntity(tm, entity))
                    .collect(Collectors.toList())
            );
        }
        
        return entity;
    }
    
    public ConnectionConfig toConnectionConfig(ConnectionConfigEntity entity) {
        ConnectionConfig config = new ConnectionConfig();
        config.setType(entity.getType());
        config.setHost(entity.getHost());
        config.setPort(entity.getPort());
        config.setDatabase(entity.getDatabase());
        config.setSchema(entity.getSchema());
        config.setUsername(entity.getUsername());
        config.setPassword(entity.getPassword());
        config.setConnectionString(entity.getConnectionString());
        config.setIsConnected(entity.getIsConnected());
        return config;
    }
    
    public ConnectionConfigEntity toConnectionConfigEntity(ConnectionConfig model, String connectionType) {
        ConnectionConfigEntity entity = new ConnectionConfigEntity();
        entity.setType(model.getType());
        entity.setHost(model.getHost());
        entity.setPort(model.getPort());
        entity.setDatabase(model.getDatabase());
        entity.setSchema(model.getSchema());
        entity.setUsername(model.getUsername());
        entity.setPassword(model.getPassword());
        entity.setConnectionString(model.getConnectionString());
        entity.setIsConnected(model.getIsConnected());
        entity.setConnectionType(connectionType);
        return entity;
    }
    
    public TableMapping toTableMapping(TableMappingEntity entity) {
        TableMapping mapping = new TableMapping();
        mapping.setId(entity.getId());
        mapping.setSourceTable(entity.getSourceTable());
        mapping.setSourceSchema(entity.getSourceSchema());
        mapping.setTargetTable(entity.getTargetTable());
        mapping.setTargetSchema(entity.getTargetSchema());
        mapping.setEnabled(entity.getEnabled());
        mapping.setStatus(entity.getStatus());
        mapping.setFilterCondition(entity.getFilterCondition());
        mapping.setDropBeforeInsert(entity.getDropBeforeInsert());
        mapping.setTruncateBeforeInsert(entity.getTruncateBeforeInsert());
        mapping.setPartitionColumn(entity.getPartitionColumn());
        mapping.setChunkSize(entity.getChunkSize());
        mapping.setChunkWorkers(entity.getChunkWorkers());
        mapping.setPartitionMinValue(entity.getPartitionMinValue());
        mapping.setPartitionMaxValue(entity.getPartitionMaxValue());
        
        if (entity.getColumnMappings() != null) {
            mapping.setColumnMappings(
                entity.getColumnMappings().stream()
                    .map(this::toColumnMapping)
                    .collect(Collectors.toList())
            );
        }
        
        return mapping;
    }
    
    public TableMappingEntity toTableMappingEntity(TableMapping model, ProjectEntity project) {
        TableMappingEntity entity = new TableMappingEntity();
        if (model.getId() != null) {
            entity.setId(model.getId());
        }
        entity.setSourceTable(model.getSourceTable());
        entity.setSourceSchema(model.getSourceSchema());
        entity.setTargetTable(model.getTargetTable());
        entity.setTargetSchema(model.getTargetSchema());
        entity.setEnabled(model.getEnabled() != null ? model.getEnabled() : true);
        entity.setStatus(model.getStatus() != null ? model.getStatus() : "pending");
        entity.setFilterCondition(model.getFilterCondition());
        entity.setDropBeforeInsert(model.getDropBeforeInsert() != null ? model.getDropBeforeInsert() : false);
        entity.setTruncateBeforeInsert(model.getTruncateBeforeInsert() != null ? model.getTruncateBeforeInsert() : false);
        entity.setPartitionColumn(model.getPartitionColumn());
        entity.setChunkSize(model.getChunkSize());
        entity.setChunkWorkers(model.getChunkWorkers());
        entity.setPartitionMinValue(model.getPartitionMinValue());
        entity.setPartitionMaxValue(model.getPartitionMaxValue());
        entity.setProject(project);
        
        if (model.getColumnMappings() != null) {
            entity.setColumnMappings(
                model.getColumnMappings().stream()
                    .map(cm -> toColumnMappingEntity(cm, entity))
                    .collect(Collectors.toList())
            );
        }
        
        return entity;
    }
    
    public ColumnMapping toColumnMapping(ColumnMappingEntity entity) {
        ColumnMapping mapping = new ColumnMapping();
        mapping.setId(entity.getId());
        mapping.setSourceColumn(entity.getSourceColumn());
        mapping.setSourceDataType(entity.getSourceDataType());
        mapping.setSourceDataLength(entity.getSourceDataLength());
        mapping.setSourceDataPrecision(entity.getSourceDataPrecision());
        mapping.setSourceDataScale(entity.getSourceDataScale());
        mapping.setTargetColumn(entity.getTargetColumn());
        mapping.setTargetDataType(entity.getTargetDataType());
        mapping.setTargetDataLength(entity.getTargetDataLength());
        mapping.setTargetDataPrecision(entity.getTargetDataPrecision());
        mapping.setTargetDataScale(entity.getTargetDataScale());
        mapping.setTransformation(entity.getTransformation());
        mapping.setNullable(entity.getNullable());
        mapping.setIsPrimaryKey(entity.getIsPrimaryKey());
        mapping.setIsForeignKey(entity.getIsForeignKey());
        return mapping;
    }
    
    public ColumnMappingEntity toColumnMappingEntity(ColumnMapping model, TableMappingEntity tableMapping) {
        ColumnMappingEntity entity = new ColumnMappingEntity();
        if (model.getId() != null) {
            entity.setId(model.getId());
        }
        entity.setSourceColumn(model.getSourceColumn());
        entity.setSourceDataType(model.getSourceDataType());
        entity.setSourceDataLength(model.getSourceDataLength());
        entity.setSourceDataPrecision(model.getSourceDataPrecision());
        entity.setSourceDataScale(model.getSourceDataScale());
        entity.setTargetColumn(model.getTargetColumn());
        entity.setTargetDataType(model.getTargetDataType());
        entity.setTargetDataLength(model.getTargetDataLength());
        entity.setTargetDataPrecision(model.getTargetDataPrecision());
        entity.setTargetDataScale(model.getTargetDataScale());
        entity.setTransformation(model.getTransformation());
        entity.setNullable(model.getNullable() != null ? model.getNullable() : true);
        entity.setIsPrimaryKey(model.getIsPrimaryKey() != null ? model.getIsPrimaryKey() : false);
        entity.setIsForeignKey(model.getIsForeignKey() != null ? model.getIsForeignKey() : false);
        entity.setTableMapping(tableMapping);
        return entity;
    }
}

