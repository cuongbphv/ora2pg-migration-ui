package com.ora2pg.migration.mapper;

import com.ora2pg.migration.entity.*;
import com.ora2pg.migration.model.ConnectionConfig;
import com.ora2pg.migration.model.pg2pg.*;
import org.springframework.stereotype.Component;

import java.util.stream.Collectors;

@Component
public class PipelineMapper {
    
    public Pipeline toModel(PipelineEntity entity) {
        Pipeline pipeline = new Pipeline();
        pipeline.setId(entity.getId());
        pipeline.setName(entity.getName());
        pipeline.setDescription(entity.getDescription());
        pipeline.setCreatedAt(entity.getCreatedAt());
        pipeline.setUpdatedAt(entity.getUpdatedAt());
        pipeline.setStatus(entity.getStatus());
        pipeline.setUserId(entity.getUser().getId());
        pipeline.setTotalRuns(entity.getTotalRuns());
        pipeline.setLastRunAt(entity.getLastRunAt());
        
        if (entity.getSteps() != null) {
            pipeline.setSteps(
                entity.getSteps().stream()
                    .map(this::toPipelineStep)
                    .collect(Collectors.toList())
            );
        }
        
        // Map connections
        if (entity.getConnections() != null) {
            entity.getConnections().forEach(conn -> {
                ConnectionConfig config = toConnectionConfig(conn);
                if ("source".equals(conn.getConnectionType())) {
                    pipeline.setSourceConnection(config);
                } else if ("target".equals(conn.getConnectionType())) {
                    pipeline.setTargetConnection(config);
                }
            });
        }
        
        return pipeline;
    }
    
    public PipelineEntity toEntity(Pipeline model, User user) {
        PipelineEntity entity = new PipelineEntity();
        if (model.getId() != null) {
            entity.setId(model.getId());
        }
        entity.setName(model.getName());
        entity.setDescription(model.getDescription());
        entity.setStatus(model.getStatus() != null ? model.getStatus() : "draft");
        entity.setUser(user);
        
        if (model.getSteps() != null) {
            entity.setSteps(
                model.getSteps().stream()
                    .map(step -> toPipelineStepEntity(step, entity))
                    .collect(Collectors.toList())
            );
        }
        
        return entity;
    }
    
    public PipelineStep toPipelineStep(PipelineStepEntity entity) {
        PipelineStep step = new PipelineStep();
        step.setId(entity.getId());
        step.setOrder(entity.getStepOrder());
        step.setSourceSchema(entity.getSourceSchema());
        step.setSourceTable(entity.getSourceTable());
        step.setTargetSchema(entity.getTargetSchema());
        step.setTargetTable(entity.getTargetTable());
        step.setDescription(entity.getDescription());
        step.setStatus(entity.getStatus());
        step.setFilterEnabled(entity.getFilterEnabled());
        step.setFilterWhereClause(entity.getFilterWhereClause());
        step.setFilterDescription(entity.getFilterDescription());
        step.setDisableTriggers(entity.getDisableTriggers());
        step.setDisableConstraints(entity.getDisableConstraints());
        step.setPipelineId(entity.getPipeline().getId());
        
        if (entity.getColumnMappings() != null) {
            step.setColumnMappings(
                entity.getColumnMappings().stream()
                    .map(this::toColumnMapping)
                    .collect(Collectors.toList())
            );
        }
        
        return step;
    }
    
    public PipelineStepEntity toPipelineStepEntity(PipelineStep model, PipelineEntity pipeline) {
        PipelineStepEntity entity = new PipelineStepEntity();
        if (model.getId() != null) {
            entity.setId(model.getId());
        }
        entity.setStepOrder(model.getOrder());
        entity.setSourceSchema(model.getSourceSchema());
        entity.setSourceTable(model.getSourceTable());
        entity.setTargetSchema(model.getTargetSchema());
        entity.setTargetTable(model.getTargetTable());
        entity.setDescription(model.getDescription());
        entity.setStatus(model.getStatus() != null ? model.getStatus() : "draft");
        entity.setFilterEnabled(model.getFilterEnabled() != null ? model.getFilterEnabled() : false);
        entity.setFilterWhereClause(model.getFilterWhereClause());
        entity.setFilterDescription(model.getFilterDescription());
        entity.setDisableTriggers(model.getDisableTriggers() != null ? model.getDisableTriggers() : false);
        entity.setDisableConstraints(model.getDisableConstraints() != null ? model.getDisableConstraints() : false);
        entity.setPipeline(pipeline);
        
        if (model.getColumnMappings() != null) {
            entity.setColumnMappings(
                model.getColumnMappings().stream()
                    .map(col -> toColumnMappingEntity(col, entity))
                    .collect(Collectors.toList())
            );
        }
        
        return entity;
    }
    
    public Pg2PgColumnMapping toColumnMapping(Pg2PgColumnMappingEntity entity) {
        Pg2PgColumnMapping mapping = new Pg2PgColumnMapping();
        mapping.setId(entity.getId());
        mapping.setSourceColumn(entity.getSourceColumn());
        mapping.setSourceDataType(entity.getSourceDataType());
        mapping.setTargetColumn(entity.getTargetColumn());
        mapping.setTargetDataType(entity.getTargetDataType());
        mapping.setTransformationType(entity.getTransformationType());
        mapping.setTransformation(entity.getTransformation());
        mapping.setDescription(entity.getDescription());
        mapping.setNullable(entity.getNullable());
        mapping.setIsPrimaryKey(entity.getIsPrimaryKey());
        mapping.setIsForeignKey(entity.getIsForeignKey());
        mapping.setPipelineStepId(entity.getPipelineStep().getId());
        return mapping;
    }
    
    public Pg2PgColumnMappingEntity toColumnMappingEntity(Pg2PgColumnMapping model, PipelineStepEntity step) {
        Pg2PgColumnMappingEntity entity = new Pg2PgColumnMappingEntity();
        if (model.getId() != null) {
            entity.setId(model.getId());
        }
        entity.setSourceColumn(model.getSourceColumn());
        entity.setSourceDataType(model.getSourceDataType());
        entity.setTargetColumn(model.getTargetColumn());
        entity.setTargetDataType(model.getTargetDataType());
        entity.setTransformationType(model.getTransformationType());
        entity.setTransformation(model.getTransformation());
        entity.setDescription(model.getDescription());
        entity.setNullable(model.getNullable() != null ? model.getNullable() : true);
        entity.setIsPrimaryKey(model.getIsPrimaryKey() != null ? model.getIsPrimaryKey() : false);
        entity.setIsForeignKey(model.getIsForeignKey() != null ? model.getIsForeignKey() : false);
        entity.setPipelineStep(step);
        return entity;
    }
    
    public ConnectionConfig toConnectionConfig(PipelineConnectionEntity entity) {
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
    
    public PipelineConnectionEntity toConnectionEntity(ConnectionConfig model, String connectionType, PipelineEntity pipeline) {
        PipelineConnectionEntity entity = new PipelineConnectionEntity();
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
        entity.setPipeline(pipeline);
        return entity;
    }
    
    public PipelineExecution toExecution(PipelineExecutionEntity entity) {
        PipelineExecution execution = new PipelineExecution();
        execution.setId(entity.getId());
        execution.setPipelineId(entity.getPipeline().getId());
        execution.setStatus(entity.getStatus());
        execution.setStartTime(entity.getStartTime());
        execution.setEndTime(entity.getEndTime());
        execution.setTotalRows(entity.getTotalRows());
        execution.setProcessedRows(entity.getProcessedRows());
        execution.setFailedRows(entity.getFailedRows());
        execution.setErrorMessage(entity.getErrorMessage());
        return execution;
    }
    
    public PipelineLog toLog(PipelineLogEntity entity) {
        PipelineLog log = new PipelineLog();
        log.setId(entity.getId());
        log.setPipelineId(entity.getPipeline().getId());
        log.setExecutionId(entity.getExecution() != null ? entity.getExecution().getId() : null);
        log.setTimestamp(entity.getTimestamp());
        log.setLevel(entity.getLevel());
        log.setMessage(entity.getMessage());
        log.setDetails(entity.getDetails());
        log.setStepId(entity.getStepId());
        return log;
    }
}

