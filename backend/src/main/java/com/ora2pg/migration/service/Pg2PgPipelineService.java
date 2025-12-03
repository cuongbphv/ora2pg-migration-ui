package com.ora2pg.migration.service;

import com.ora2pg.migration.entity.*;
import com.ora2pg.migration.mapper.PipelineMapper;
import com.ora2pg.migration.model.ConnectionConfig;
import com.ora2pg.migration.model.pg2pg.*;
import com.ora2pg.migration.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class Pg2PgPipelineService {
    
    private final PipelineRepository pipelineRepository;
    private final PipelineStepRepository pipelineStepRepository;
    private final PipelineConnectionRepository pipelineConnectionRepository;
    private final PipelineExecutionRepository pipelineExecutionRepository;
    private final PipelineLogRepository pipelineLogRepository;
    private final UserRepository userRepository;
    private final PipelineMapper pipelineMapper;
    private final Pg2PgExecutionService executionService;
    
    private User getCurrentUser() {
        org.springframework.security.core.Authentication auth = 
            org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null) {
            throw new RuntimeException("User not authenticated");
        }
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
    
    public List<Pipeline> getAllPipelines() {
        User user = getCurrentUser();
        return pipelineRepository.findByUserOrderByCreatedAtDesc(user).stream()
                .map(pipelineMapper::toModel)
                .collect(Collectors.toList());
    }
    
    public Pipeline getPipelineById(String id) {
        User user = getCurrentUser();
        PipelineEntity entity = pipelineRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Pipeline not found: " + id));
        
        if (!entity.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Access denied");
        }
        
        return pipelineMapper.toModel(entity);
    }
    
    @Transactional
    public Pipeline createPipeline(String name, String description) {
        User user = getCurrentUser();
        Pipeline pipeline = new Pipeline();
        pipeline.setName(name);
        pipeline.setDescription(description);
        pipeline.setStatus("draft");
        
        PipelineEntity entity = pipelineMapper.toEntity(pipeline, user);
        entity = pipelineRepository.save(entity);
        return pipelineMapper.toModel(entity);
    }
    
    @Transactional
    public Pipeline updatePipeline(Pipeline pipeline) {
        User user = getCurrentUser();
        PipelineEntity entity = pipelineRepository.findById(pipeline.getId())
                .orElseThrow(() -> new IllegalArgumentException("Pipeline not found: " + pipeline.getId()));
        
        if (!entity.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Access denied");
        }
        
        entity.setName(pipeline.getName());
        entity.setDescription(pipeline.getDescription());
        entity.setStatus(pipeline.getStatus());
        
        // Update connections
        if (pipeline.getSourceConnection() != null) {
            entity.getConnections().removeIf(c -> "source".equals(c.getConnectionType()));
            PipelineConnectionEntity sourceConn = pipelineMapper.toConnectionEntity(
                pipeline.getSourceConnection(), "source", entity);
            entity.getConnections().add(sourceConn);
        }
        if (pipeline.getTargetConnection() != null) {
            entity.getConnections().removeIf(c -> "target".equals(c.getConnectionType()));
            PipelineConnectionEntity targetConn = pipelineMapper.toConnectionEntity(
                pipeline.getTargetConnection(), "target", entity);
            entity.getConnections().add(targetConn);
        }
        
        // Update steps
        if (pipeline.getSteps() != null) {
            // Remove existing steps not in the update
            List<String> stepIds = pipeline.getSteps().stream()
                    .map(PipelineStep::getId)
                    .filter(id -> id != null)
                    .collect(Collectors.toList());
            entity.getSteps().removeIf(step -> !stepIds.contains(step.getId()));
            
            // Update or add steps
            for (PipelineStep stepModel : pipeline.getSteps()) {
                PipelineStepEntity stepEntity;
                if (stepModel.getId() != null) {
                    stepEntity = entity.getSteps().stream()
                            .filter(s -> s.getId().equals(stepModel.getId()))
                            .findFirst()
                            .orElse(null);
                    if (stepEntity == null) {
                        stepEntity = new PipelineStepEntity();
                        stepEntity.setPipeline(entity);
                    }
                } else {
                    stepEntity = new PipelineStepEntity();
                    stepEntity.setPipeline(entity);
                }
                
                // Update step fields
                stepEntity.setStepOrder(stepModel.getOrder());
                stepEntity.setSourceSchema(stepModel.getSourceSchema());
                stepEntity.setSourceTable(stepModel.getSourceTable());
                stepEntity.setTargetSchema(stepModel.getTargetSchema());
                stepEntity.setTargetTable(stepModel.getTargetTable());
                stepEntity.setDescription(stepModel.getDescription());
                stepEntity.setStatus(stepModel.getStatus());
                stepEntity.setFilterEnabled(stepModel.getFilterEnabled() != null ? stepModel.getFilterEnabled() : false);
                stepEntity.setFilterWhereClause(stepModel.getFilterWhereClause());
                stepEntity.setFilterDescription(stepModel.getFilterDescription());
                stepEntity.setDisableTriggers(stepModel.getDisableTriggers() != null ? stepModel.getDisableTriggers() : false);
                stepEntity.setDisableConstraints(stepModel.getDisableConstraints() != null ? stepModel.getDisableConstraints() : false);
                
                // Update column mappings
                if (stepModel.getColumnMappings() != null) {
                    List<String> colIds = stepModel.getColumnMappings().stream()
                            .map(Pg2PgColumnMapping::getId)
                            .filter(id -> id != null)
                            .collect(Collectors.toList());
                    stepEntity.getColumnMappings().removeIf(col -> !colIds.contains(col.getId()));
                    
                    for (Pg2PgColumnMapping colModel : stepModel.getColumnMappings()) {
                        Pg2PgColumnMappingEntity colEntity;
                        if (colModel.getId() != null) {
                            colEntity = stepEntity.getColumnMappings().stream()
                                    .filter(c -> c.getId().equals(colModel.getId()))
                                    .findFirst()
                                    .orElse(null);
                            if (colEntity == null) {
                                colEntity = new Pg2PgColumnMappingEntity();
                                colEntity.setPipelineStep(stepEntity);
                            }
                        } else {
                            colEntity = new Pg2PgColumnMappingEntity();
                            colEntity.setPipelineStep(stepEntity);
                        }
                        
                        colEntity.setSourceColumn(colModel.getSourceColumn());
                        colEntity.setSourceDataType(colModel.getSourceDataType());
                        colEntity.setTargetColumn(colModel.getTargetColumn());
                        colEntity.setTargetDataType(colModel.getTargetDataType());
                        colEntity.setTransformationType(colModel.getTransformationType());
                        colEntity.setTransformation(colModel.getTransformation());
                        colEntity.setDescription(colModel.getDescription());
                        colEntity.setNullable(colModel.getNullable() != null ? colModel.getNullable() : true);
                        colEntity.setIsPrimaryKey(colModel.getIsPrimaryKey() != null ? colModel.getIsPrimaryKey() : false);
                        colEntity.setIsForeignKey(colModel.getIsForeignKey() != null ? colModel.getIsForeignKey() : false);
                        
                        if (!stepEntity.getColumnMappings().contains(colEntity)) {
                            stepEntity.getColumnMappings().add(colEntity);
                        }
                    }
                }
                
                if (!entity.getSteps().contains(stepEntity)) {
                    entity.getSteps().add(stepEntity);
                }
            }
        }
        
        entity = pipelineRepository.save(entity);
        return pipelineMapper.toModel(entity);
    }
    
    @Transactional
    public void deletePipeline(String id) {
        User user = getCurrentUser();
        PipelineEntity entity = pipelineRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Pipeline not found: " + id));
        
        if (!entity.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Access denied");
        }
        
        pipelineRepository.delete(entity);
    }
    
    @Transactional
    public PipelineStep addStepToPipeline(String pipelineId, PipelineStep step) {
        User user = getCurrentUser();
        PipelineEntity pipeline = pipelineRepository.findById(pipelineId)
                .orElseThrow(() -> new IllegalArgumentException("Pipeline not found: " + pipelineId));
        
        if (!pipeline.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Access denied");
        }
        
        PipelineStepEntity stepEntity = pipelineMapper.toPipelineStepEntity(step, pipeline);
        stepEntity = pipelineStepRepository.save(stepEntity);
        return pipelineMapper.toPipelineStep(stepEntity);
    }
    
    @Transactional
    public PipelineStep updateStep(String stepId, PipelineStep step) {
        User user = getCurrentUser();
        PipelineStepEntity stepEntity = pipelineStepRepository.findById(stepId)
                .orElseThrow(() -> new IllegalArgumentException("Step not found: " + stepId));
        
        if (!stepEntity.getPipeline().getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Access denied");
        }
        
        stepEntity.setStepOrder(step.getOrder());
        stepEntity.setSourceSchema(step.getSourceSchema());
        stepEntity.setSourceTable(step.getSourceTable());
        stepEntity.setTargetSchema(step.getTargetSchema());
        stepEntity.setTargetTable(step.getTargetTable());
        stepEntity.setDescription(step.getDescription());
        stepEntity.setStatus(step.getStatus());
        stepEntity.setFilterEnabled(step.getFilterEnabled() != null ? step.getFilterEnabled() : false);
        stepEntity.setFilterWhereClause(step.getFilterWhereClause());
        stepEntity.setFilterDescription(step.getFilterDescription());
        stepEntity.setDisableTriggers(step.getDisableTriggers() != null ? step.getDisableTriggers() : false);
        stepEntity.setDisableConstraints(step.getDisableConstraints() != null ? step.getDisableConstraints() : false);
        
        // Update column mappings
        if (step.getColumnMappings() != null) {
            List<String> colIds = step.getColumnMappings().stream()
                    .map(Pg2PgColumnMapping::getId)
                    .filter(id -> id != null)
                    .collect(Collectors.toList());
            stepEntity.getColumnMappings().removeIf(col -> !colIds.contains(col.getId()));
            
            for (Pg2PgColumnMapping colModel : step.getColumnMappings()) {
                Pg2PgColumnMappingEntity colEntity;
                if (colModel.getId() != null) {
                    colEntity = stepEntity.getColumnMappings().stream()
                            .filter(c -> c.getId().equals(colModel.getId()))
                            .findFirst()
                            .orElse(null);
                    if (colEntity == null) {
                        colEntity = new Pg2PgColumnMappingEntity();
                        colEntity.setPipelineStep(stepEntity);
                    }
                } else {
                    colEntity = new Pg2PgColumnMappingEntity();
                    colEntity.setPipelineStep(stepEntity);
                }
                
                colEntity.setSourceColumn(colModel.getSourceColumn());
                colEntity.setSourceDataType(colModel.getSourceDataType());
                colEntity.setTargetColumn(colModel.getTargetColumn());
                colEntity.setTargetDataType(colModel.getTargetDataType());
                colEntity.setTransformationType(colModel.getTransformationType());
                colEntity.setTransformation(colModel.getTransformation());
                colEntity.setDescription(colModel.getDescription());
                colEntity.setNullable(colModel.getNullable() != null ? colModel.getNullable() : true);
                colEntity.setIsPrimaryKey(colModel.getIsPrimaryKey() != null ? colModel.getIsPrimaryKey() : false);
                colEntity.setIsForeignKey(colModel.getIsForeignKey() != null ? colModel.getIsForeignKey() : false);
                
                if (!stepEntity.getColumnMappings().contains(colEntity)) {
                    stepEntity.getColumnMappings().add(colEntity);
                }
            }
        }
        
        stepEntity = pipelineStepRepository.save(stepEntity);
        return pipelineMapper.toPipelineStep(stepEntity);
    }
    
    @Transactional
    public void deleteStep(String stepId) {
        User user = getCurrentUser();
        PipelineStepEntity stepEntity = pipelineStepRepository.findById(stepId)
                .orElseThrow(() -> new IllegalArgumentException("Step not found: " + stepId));
        
        if (!stepEntity.getPipeline().getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Access denied");
        }
        
        pipelineStepRepository.delete(stepEntity);
    }
    
    @Transactional
    public Pipeline saveConnection(String pipelineId, String type, ConnectionConfig connection) {
        User user = getCurrentUser();
        PipelineEntity entity = pipelineRepository.findById(pipelineId)
                .orElseThrow(() -> new IllegalArgumentException("Pipeline not found: " + pipelineId));
        
        if (!entity.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Access denied");
        }
        
        // Remove existing connection of this type
        entity.getConnections().removeIf(c -> type.equalsIgnoreCase(c.getConnectionType()));
        
        // Add new connection
        PipelineConnectionEntity connEntity = pipelineMapper.toConnectionEntity(connection, type, entity);
        entity.getConnections().add(connEntity);
        
        // Update status if both connections are set
        if (entity.getConnections().stream().anyMatch(c -> "source".equals(c.getConnectionType())) &&
            entity.getConnections().stream().anyMatch(c -> "target".equals(c.getConnectionType()))) {
            if (entity.getStatus().equals("draft") && !entity.getSteps().isEmpty()) {
                entity.setStatus("configured");
            }
        }
        
        entity = pipelineRepository.save(entity);
        return pipelineMapper.toModel(entity);
    }
    
    @Transactional
    public PipelineExecution startExecution(String pipelineId) {
        User user = getCurrentUser();
        PipelineEntity pipeline = pipelineRepository.findById(pipelineId)
                .orElseThrow(() -> new IllegalArgumentException("Pipeline not found: " + pipelineId));
        
        if (!pipeline.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Access denied");
        }
        
        // Check if already running
        pipelineExecutionRepository.findByPipelineIdAndStatus(pipelineId, "running")
                .ifPresent(ex -> {
                    throw new IllegalStateException("Pipeline is already running");
                });
        
        // Create execution
        PipelineExecutionEntity execution = new PipelineExecutionEntity();
        execution.setPipeline(pipeline);
        execution.setStatus("running");
        execution.setStartTime(LocalDateTime.now());
        execution.setTotalRows(0L);
        execution.setProcessedRows(0L);
        execution.setFailedRows(0L);
        execution = pipelineExecutionRepository.save(execution);
        
        // Update pipeline
        pipeline.setStatus("running");
        pipeline.setTotalRuns(pipeline.getTotalRuns() + 1);
        pipeline.setLastRunAt(LocalDateTime.now());
        pipelineRepository.save(pipeline);
        
        // Add log
        PipelineLogEntity pipelineLog = new PipelineLogEntity();
        pipelineLog.setPipeline(pipeline);
        pipelineLog.setExecution(execution);
        pipelineLog.setTimestamp(LocalDateTime.now());
        pipelineLog.setLevel("info");
        pipelineLog.setMessage("Pipeline execution started");
        pipelineLogRepository.save(pipelineLog);
        
        // Flush to ensure execution is persisted before starting background thread
        pipelineExecutionRepository.flush();
        
        // Start execution in background thread after transaction commits
        String executionId = execution.getId();
        String finalPipelineId = pipelineId;
        Thread executionThread = new Thread(() -> {
            // Wait a bit to ensure transaction is committed
            try {
                Thread.sleep(100);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            
            try {
                executionService.executePipeline(finalPipelineId, executionId);
            } catch (Exception e) {
                log.error("Pipeline execution failed", e);
                try {
                    PipelineExecutionEntity exec = pipelineExecutionRepository.findById(executionId)
                        .orElse(null);
                    if (exec != null) {
                        exec.setStatus("failed");
                        exec.setErrorMessage(e.getMessage());
                        exec.setEndTime(LocalDateTime.now());
                        pipelineExecutionRepository.save(exec);
                        
                        PipelineEntity pipe = pipelineRepository.findById(finalPipelineId).orElse(null);
                        if (pipe != null) {
                            pipe.setStatus("error");
                            pipelineRepository.save(pipe);
                        }
                    }
                } catch (Exception saveError) {
                    log.error("Failed to save execution failure status", saveError);
                }
            }
        });
        executionThread.setName("Pg2Pg-Execution-" + pipelineId);
        executionThread.start();
        
        return pipelineMapper.toExecution(execution);
    }
    
    @Transactional
    public PipelineExecutionEntity stopExecution(String pipelineId) {
        User user = getCurrentUser();
        PipelineEntity pipeline = pipelineRepository.findById(pipelineId)
                .orElseThrow(() -> new IllegalArgumentException("Pipeline not found: " + pipelineId));
        
        if (!pipeline.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Access denied");
        }

        final PipelineExecutionEntity[] finalExecution = new PipelineExecutionEntity[1];
        
        pipelineExecutionRepository.findByPipelineIdAndStatus(pipelineId, "running")
                .ifPresent(execution -> {
                    execution.setStatus("paused");
                    execution.setEndTime(LocalDateTime.now());
                    pipelineExecutionRepository.save(execution);

                    finalExecution[0] = execution;
                    
                    pipeline.setStatus("paused");
                    pipelineRepository.save(pipeline);
                    
                    PipelineLogEntity log = new PipelineLogEntity();
                    log.setPipeline(pipeline);
                    log.setExecution(execution);
                    log.setTimestamp(LocalDateTime.now());
                    log.setLevel("info");
                    log.setMessage("Pipeline execution paused");
                    pipelineLogRepository.save(log);
                });

        return finalExecution[0];
    }
    
    public List<PipelineLog> getLogs(String pipelineId, String executionId) {
        User user = getCurrentUser();
        PipelineEntity pipeline = pipelineRepository.findById(pipelineId)
                .orElseThrow(() -> new IllegalArgumentException("Pipeline not found: " + pipelineId));
        
        if (!pipeline.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Access denied");
        }
        
        if (executionId != null) {
            return pipelineLogRepository.findByExecutionIdOrderByTimestampAsc(executionId).stream()
                    .map(pipelineMapper::toLog)
                    .collect(Collectors.toList());
        } else {
            return pipelineLogRepository.findByPipelineIdOrderByTimestampDesc(pipelineId).stream()
                    .map(pipelineMapper::toLog)
                    .collect(Collectors.toList());
        }
    }
    
    public List<PipelineExecution> getExecutions(String pipelineId) {
        User user = getCurrentUser();
        PipelineEntity pipeline = pipelineRepository.findById(pipelineId)
                .orElseThrow(() -> new IllegalArgumentException("Pipeline not found: " + pipelineId));
        
        if (!pipeline.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Access denied");
        }
        
        return pipelineExecutionRepository.findByPipelineIdOrderByStartTimeDesc(pipelineId).stream()
                .map(pipelineMapper::toExecution)
                .collect(Collectors.toList());
    }
}

