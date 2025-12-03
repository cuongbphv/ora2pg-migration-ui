package com.ora2pg.migration.service;

import com.ora2pg.migration.entity.*;
import com.ora2pg.migration.mapper.PipelineMapper;
import com.ora2pg.migration.model.ConnectionConfig;
import com.ora2pg.migration.model.pg2pg.PipelineStep;
import com.ora2pg.migration.repository.*;
import com.ora2pg.migration.util.DatabaseConnectionManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

@Slf4j
@Service
@RequiredArgsConstructor
public class Pg2PgExecutionService {
    
    private final DatabaseConnectionManager connectionManager;
    private final PipelineRepository pipelineRepository;
    private final PipelineExecutionRepository executionRepository;
    private final PipelineLogRepository logRepository;
    private final PipelineMapper pipelineMapper;
    private final Pg2PgSqlGenerator sqlGenerator;
    
    /**
     * Executes a pipeline step migration
     */
    @Transactional
    public StepExecutionResult executeStep(PipelineStep step, PipelineEntity pipeline, 
                                          PipelineExecutionEntity execution,
                                          ConnectionConfig sourceConn, ConnectionConfig targetConn) {
        String stepId = step.getId();
        String timestamp = LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        
        // Use schema from connection if step schema is empty
        String sourceSchema = step.getSourceSchema();
        if (sourceSchema == null || sourceSchema.trim().isEmpty()) {
            sourceSchema = sourceConn.getSchema() != null ? sourceConn.getSchema() : "public";
        }
        
        String targetSchema = step.getTargetSchema();
        if (targetSchema == null || targetSchema.trim().isEmpty()) {
            targetSchema = targetConn.getSchema() != null ? targetConn.getSchema() : "public";
        }
        
        // Create a copy of step with resolved schemas
        PipelineStep stepWithSchema = new PipelineStep();
        stepWithSchema.setId(step.getId());
        stepWithSchema.setOrder(step.getOrder());
        stepWithSchema.setSourceSchema(sourceSchema);
        stepWithSchema.setSourceTable(step.getSourceTable());
        stepWithSchema.setTargetSchema(targetSchema);
        stepWithSchema.setTargetTable(step.getTargetTable());
        stepWithSchema.setDescription(step.getDescription());
        stepWithSchema.setStatus(step.getStatus());
        stepWithSchema.setFilterEnabled(step.getFilterEnabled());
        stepWithSchema.setFilterWhereClause(step.getFilterWhereClause());
        stepWithSchema.setFilterDescription(step.getFilterDescription());
        stepWithSchema.setDisableTriggers(step.getDisableTriggers());
        stepWithSchema.setDisableConstraints(step.getDisableConstraints());
        stepWithSchema.setPipelineId(step.getPipelineId());
        stepWithSchema.setColumnMappings(step.getColumnMappings());
        
        StepExecutionResult result = new StepExecutionResult();
        result.stepId = stepId;
        result.startTime = LocalDateTime.now();
        
        try {
            addLog(pipeline, execution, stepId, "info", 
                "Starting migration: " + sourceSchema + "." + step.getSourceTable() + 
                " -> " + targetSchema + "." + step.getTargetTable(), null);
            
            // Validate connections
            if (sourceConn == null || targetConn == null) {
                throw new IllegalStateException("Source or target connection not configured");
            }
            
            // Check if source table exists
            try (Connection source = connectionManager.getConnection(sourceConn)) {
                if (!tableExists(source, sourceSchema, step.getSourceTable())) {
                    throw new SQLException("Source table does not exist: " + 
                        sourceSchema + "." + step.getSourceTable());
                }
                
                // Count source rows
                long sourceRows = countSourceRows(source, stepWithSchema);
                result.sourceRows = sourceRows;
                addLog(pipeline, execution, stepId, "info", 
                    "Source table has " + sourceRows + " rows", null);
            }
            
            // Generate SQL
            String migrationSql = sqlGenerator.generateMigrationSql(stepWithSchema, timestamp);
            addLog(pipeline, execution, stepId, "info", "Generated migration SQL", migrationSql);
            
            // Execute migration
            try (Connection target = connectionManager.getConnection(targetConn)) {
                // Create schema if needed
                createSchemaIfNotExists(target, targetSchema);
                
                // Execute the SQL script
                executeSqlScript(target, migrationSql, pipeline, execution, stepId);
                
                // Get migration statistics
                long targetRows = countRows(target, targetSchema, step.getTargetTable());
                long migratedRows = countMigratedRows(target, targetSchema, step.getTargetTable(), timestamp);
                
                result.targetRows = targetRows;
                result.migratedRows = migratedRows;
                result.success = true;
                
                addLog(pipeline, execution, stepId, "success", 
                    String.format("Migration completed: %d rows migrated", migratedRows), null);
            }
            
        } catch (Exception e) {
            result.success = false;
            result.errorMessage = e.getMessage();
            addLog(pipeline, execution, stepId, "error", 
                "Migration failed: " + e.getMessage(), e.getClass().getName());
            log.error("Step execution failed", e);
        } finally {
            result.endTime = LocalDateTime.now();
        }
        
        return result;
    }
    
    /**
     * Executes entire pipeline
     */
    @Transactional
    public void executePipeline(String pipelineId, String executionId) {
        // Retry logic to handle transaction commit delay
        PipelineExecutionEntity execution = null;
        int retries = 5;
        for (int i = 0; i < retries; i++) {
            execution = executionRepository.findById(executionId).orElse(null);
            if (execution != null) {
                break;
            }
            try {
                Thread.sleep(200); // Wait 200ms between retries
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new IllegalStateException("Interrupted while waiting for execution", e);
            }
        }
        
        if (execution == null) {
            throw new IllegalArgumentException("Execution not found: " + executionId + " (after " + retries + " retries)");
        }
        
        PipelineEntity pipeline = pipelineRepository.findById(pipelineId)
            .orElseThrow(() -> new IllegalArgumentException("Pipeline not found: " + pipelineId));
        
        // Verify execution belongs to this pipeline
        if (!execution.getPipeline().getId().equals(pipelineId)) {
            throw new IllegalStateException("Execution does not belong to pipeline");
        }
        
        // Verify execution is in running status
        if (!"running".equals(execution.getStatus())) {
            throw new IllegalStateException("Execution is not in running status: " + execution.getStatus());
        }
        
        // Get connections
        ConnectionConfig sourceConn = null;
        ConnectionConfig targetConn = null;
        
        for (PipelineConnectionEntity conn : pipeline.getConnections()) {
            if ("source".equals(conn.getConnectionType())) {
                sourceConn = pipelineMapper.toConnectionConfig(conn);
            } else if ("target".equals(conn.getConnectionType())) {
                targetConn = pipelineMapper.toConnectionConfig(conn);
            }
        }
        
        if (sourceConn == null || targetConn == null) {
            addLog(pipeline, execution, null, "error", 
                "Source or target connection not configured", null);
            execution.setStatus("failed");
            execution.setErrorMessage("Connections not configured");
            execution.setEndTime(LocalDateTime.now());
            executionRepository.save(execution);
            pipeline.setStatus("error");
            pipelineRepository.save(pipeline);
            return;
        }
        
        AtomicLong totalRows = new AtomicLong(0);
        AtomicLong processedRows = new AtomicLong(0);
        AtomicLong failedRows = new AtomicLong(0);
        
        // Execute steps in order
        List<PipelineStepEntity> steps = pipeline.getSteps();
        steps.sort((a, b) -> Integer.compare(a.getStepOrder(), b.getStepOrder()));
        
        addLog(pipeline, execution, null, "info", 
            "Starting pipeline execution with " + steps.size() + " steps", null);
        
        for (PipelineStepEntity stepEntity : steps) {
            if (!"configured".equals(stepEntity.getStatus()) && 
                !"draft".equals(stepEntity.getStatus()) &&
                !"error".equals(stepEntity.getStatus())) {
                continue; // Skip already executed steps (but allow retry of error steps)
            }
            
            PipelineStep step = pipelineMapper.toPipelineStep(stepEntity);
            
            // Ensure step has schemas - use connection schemas as fallback
            String resolvedSourceSchema = step.getSourceSchema();
            if (resolvedSourceSchema == null || resolvedSourceSchema.trim().isEmpty()) {
                if (sourceConn.getSchema() != null && !sourceConn.getSchema().trim().isEmpty()) {
                    resolvedSourceSchema = sourceConn.getSchema();
                } else {
                    resolvedSourceSchema = "public";
                }
                step.setSourceSchema(resolvedSourceSchema);
                stepEntity.setSourceSchema(resolvedSourceSchema);
            }
            
            String resolvedTargetSchema = step.getTargetSchema();
            if (resolvedTargetSchema == null || resolvedTargetSchema.trim().isEmpty()) {
                if (targetConn.getSchema() != null && !targetConn.getSchema().trim().isEmpty()) {
                    resolvedTargetSchema = targetConn.getSchema();
                } else {
                    resolvedTargetSchema = "public";
                }
                step.setTargetSchema(resolvedTargetSchema);
                stepEntity.setTargetSchema(resolvedTargetSchema);
            }
            
            stepEntity.setStatus("executing");
            pipelineRepository.save(pipeline);
            
            addLog(pipeline, execution, step.getId(), "info", 
                "Executing step " + step.getOrder() + ": " + 
                step.getSourceSchema() + "." + step.getSourceTable(), null);
            
            StepExecutionResult result = executeStep(step, pipeline, execution, sourceConn, targetConn);
            
            totalRows.addAndGet(result.sourceRows);
            
            if (result.success) {
                processedRows.addAndGet(result.migratedRows);
                stepEntity.setStatus("completed");
                addLog(pipeline, execution, step.getId(), "success", 
                    "Step " + step.getOrder() + " completed successfully", null);
            } else {
                failedRows.addAndGet(result.sourceRows);
                stepEntity.setStatus("error");
                addLog(pipeline, execution, step.getId(), "error", 
                    "Step " + step.getOrder() + " failed: " + result.errorMessage, null);
            }
            
            // Update execution progress
            execution.setTotalRows(totalRows.get());
            execution.setProcessedRows(processedRows.get());
            execution.setFailedRows(failedRows.get());
            executionRepository.save(execution);
            
            pipelineRepository.save(pipeline);
        }
        
        // Finalize execution
        boolean allCompleted = steps.stream()
            .allMatch(s -> "completed".equals(s.getStatus()));
        
        if (allCompleted) {
            execution.setStatus("completed");
            pipeline.setStatus("completed");
            addLog(pipeline, execution, null, "success", 
                "Pipeline execution completed successfully", null);
        } else {
            execution.setStatus("failed");
            pipeline.setStatus("error");
            addLog(pipeline, execution, null, "error", 
                "Pipeline execution completed with errors", null);
        }
        
        execution.setEndTime(LocalDateTime.now());
        executionRepository.save(execution);
        pipelineRepository.save(pipeline);
    }
    
    private boolean tableExists(Connection conn, String schema, String table) throws SQLException {
        String sql = "SELECT EXISTS (SELECT FROM information_schema.tables " +
                     "WHERE table_schema = ? AND table_name = ?)";
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, schema);
            stmt.setString(2, table);
            try (ResultSet rs = stmt.executeQuery()) {
                return rs.next() && rs.getBoolean(1);
            }
        }
    }
    
    private long countSourceRows(Connection conn, PipelineStep step) throws SQLException {
        String sql = "SELECT COUNT(*) FROM " + quoteIdentifier(step.getSourceSchema()) + 
                     "." + quoteIdentifier(step.getSourceTable());
        
        if (step.getFilterEnabled() != null && step.getFilterEnabled() && 
            step.getFilterWhereClause() != null) {
            sql += " WHERE " + step.getFilterWhereClause();
        }
        
        try (Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {
            if (rs.next()) {
                return rs.getLong(1);
            }
        }
        return 0;
    }
    
    private long countRows(Connection conn, String schema, String table) throws SQLException {
        String sql = "SELECT COUNT(*) FROM " + quoteIdentifier(schema) + "." + quoteIdentifier(table);
        try (Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {
            if (rs.next()) {
                return rs.getLong(1);
            }
        }
        return 0;
    }
    
    private long countMigratedRows(Connection conn, String schema, String table, String timestamp) throws SQLException {
        // Try to get count from migration_timestamp_ref temp table if it exists
        // Otherwise count all rows with job_timestamp matching the pattern
        String sql = "SELECT COUNT(*) FROM " + quoteIdentifier(schema) + "." + quoteIdentifier(table) +
                     " WHERE job_timestamp >= CURRENT_DATE";
        try (Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {
            if (rs.next()) {
                return rs.getLong(1);
            }
        }
        return 0;
    }
    
    private void createSchemaIfNotExists(Connection conn, String schema) throws SQLException {
        String sql = "CREATE SCHEMA IF NOT EXISTS " + quoteIdentifier(schema);
        try (Statement stmt = conn.createStatement()) {
            stmt.execute(sql);
        }
    }
    
    private void executeSqlScript(Connection conn, String sqlScript, 
                                 PipelineEntity pipeline, PipelineExecutionEntity execution,
                                 String stepId) throws SQLException {
        // PostgreSQL DO blocks use $$ delimiters, so we need to parse carefully
        // Split statements by semicolons, but respect DO $$ ... END $$; blocks
        
        List<String> statements = new ArrayList<>();
        StringBuilder currentStatement = new StringBuilder();
        boolean inDollarQuote = false;
        String dollarTag = null;
        boolean inSingleLineComment = false;
        boolean inMultiLineComment = false;
        
        char[] chars = sqlScript.toCharArray();
        int i = 0;
        
        while (i < chars.length) {
            char c = chars[i];
            char next = (i + 1 < chars.length) ? chars[i + 1] : '\0';
            
            // Handle single-line comments
            if (!inDollarQuote && !inMultiLineComment && c == '-' && next == '-') {
                inSingleLineComment = true;
                currentStatement.append(c);
                i++;
                continue;
            }
            
            if (inSingleLineComment) {
                currentStatement.append(c);
                if (c == '\n' || c == '\r') {
                    inSingleLineComment = false;
                }
                i++;
                continue;
            }
            
            // Handle multi-line comments
            if (!inDollarQuote && !inSingleLineComment && c == '/' && next == '*') {
                inMultiLineComment = true;
                currentStatement.append(c).append(next);
                i += 2;
                continue;
            }
            
            if (inMultiLineComment) {
                currentStatement.append(c);
                if (c == '*' && next == '/') {
                    inMultiLineComment = false;
                    currentStatement.append(next);
                    i += 2;
                    continue;
                }
                i++;
                continue;
            }
            
            // Check for dollar quote start: $tag$ or $$
            if (c == '$' && !inDollarQuote) {
                int start = i;
                i++;
                StringBuilder tagBuilder = new StringBuilder("$");
                // Find the closing $
                while (i < chars.length && chars[i] != '$') {
                    tagBuilder.append(chars[i]);
                    i++;
                }
                if (i < chars.length) {
                    tagBuilder.append('$');
                    dollarTag = tagBuilder.toString();
                    inDollarQuote = true;
                    currentStatement.append(dollarTag);
                    i++;
                    continue;
                }
            }
            
            // Check for dollar quote end
            if (inDollarQuote && c == '$') {
                if (dollarTag != null && i + dollarTag.length() - 1 < chars.length) {
                    String potentialEnd = sqlScript.substring(i, i + dollarTag.length());
                    if (potentialEnd.equals(dollarTag)) {
                        currentStatement.append(dollarTag);
                        i += dollarTag.length();
                        inDollarQuote = false;
                        dollarTag = null;
                        continue;
                    }
                }
            }
            
            currentStatement.append(c);
            
            // If we're not in a dollar quote and hit a semicolon, it's a statement end
            if (!inDollarQuote && c == ';') {
                String statement = currentStatement.toString().trim();
                // Remove leading/trailing whitespace and check if it's not just a comment
                if (!statement.isEmpty()) {
                    // Check if statement has actual SQL (not just comments)
                    String sqlOnly = statement.replaceAll("--.*", "").trim();
                    if (!sqlOnly.isEmpty()) {
                        statements.add(statement);
                    }
                }
                currentStatement.setLength(0);
            }
            
            i++;
        }
        
        // Add any remaining statement
        String remaining = currentStatement.toString().trim();
        if (!remaining.isEmpty()) {
            String sqlOnly = remaining.replaceAll("--.*", "").trim();
            if (!sqlOnly.isEmpty()) {
                statements.add(remaining);
            }
        }
        
        // Execute each statement
        for (String statement : statements) {
            executeStatement(conn, statement, pipeline, execution, stepId);
        }
    }
    
    private void executeStatement(Connection conn, String statement,
                                 PipelineEntity pipeline, PipelineExecutionEntity execution,
                                 String stepId) throws SQLException {
        try (Statement stmt = conn.createStatement()) {
            if (statement.toUpperCase().trim().startsWith("SELECT")) {
                // For SELECT statements, execute and log results
                try (ResultSet rs = stmt.executeQuery(statement)) {
                    while (rs.next()) {
                        // Log result if it's a statistics query
                        if (statement.contains("source_count") || 
                            statement.contains("target_count") || 
                            statement.contains("migrated_count")) {
                            int colCount = rs.getMetaData().getColumnCount();
                            StringBuilder result = new StringBuilder();
                            for (int i = 1; i <= colCount; i++) {
                                if (i > 1) result.append(", ");
                                result.append(rs.getMetaData().getColumnName(i))
                                      .append(": ").append(rs.getObject(i));
                            }
                            addLog(pipeline, execution, stepId, "info", 
                                "Statistics: " + result.toString(), null);
                        }
                    }
                }
            } else {
                boolean hasResult = stmt.execute(statement);
                if (hasResult) {
                    try (ResultSet rs = stmt.getResultSet()) {
                        // Process results if any
                    }
                }
                int updateCount = stmt.getUpdateCount();
                if (updateCount >= 0) {
                    addLog(pipeline, execution, stepId, "info", 
                        "Executed: " + updateCount + " rows affected", null);
                }
            }
        } catch (SQLException e) {
            addLog(pipeline, execution, stepId, "error", 
                "SQL execution error: " + e.getMessage(), statement);
            throw e;
        }
    }
    
    private void addLog(PipelineEntity pipeline, PipelineExecutionEntity execution,
                       String stepId, String level, String message, String details) {
        PipelineLogEntity log = new PipelineLogEntity();
        log.setPipeline(pipeline);
        log.setExecution(execution);
        log.setTimestamp(LocalDateTime.now());
        log.setLevel(level);
        log.setMessage(message);
        log.setDetails(details);
        log.setStepId(stepId);
        logRepository.save(log);
    }
    
    private String quoteIdentifier(String identifier) {
        if (identifier == null || identifier.isEmpty()) {
            return "\"\"";
        }
        identifier = identifier.replace("\"", "");
        return "\"" + identifier + "\"";
    }
    
    public static class StepExecutionResult {
        public String stepId;
        public LocalDateTime startTime;
        public LocalDateTime endTime;
        public boolean success;
        public long sourceRows;
        public long targetRows;
        public long migratedRows;
        public String errorMessage;
    }
}

