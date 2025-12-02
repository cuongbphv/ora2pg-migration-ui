package com.ora2pg.migration.service;

import com.ora2pg.migration.entity.MigrationLogEntity;
import com.ora2pg.migration.entity.ProjectEntity;
import com.ora2pg.migration.model.*;
import com.ora2pg.migration.repository.MigrationLogRepository;
import com.ora2pg.migration.repository.ProjectRepository;
import com.ora2pg.migration.util.DatabaseConnectionManager;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class MigrationService {
    
    @Autowired
    private DatabaseConnectionManager connectionManager;
    
    @Autowired
    private MigrationLogRepository migrationLogRepository;
    
    @Autowired
    private ProjectRepository projectRepository;
    
    private final ConcurrentHashMap<String, MigrationProgress> progressMap = new ConcurrentHashMap<>();
    
    public MigrationProgress startMigration(Project project, AppSettings settings) {
        MigrationProgress progress = new MigrationProgress(project.getId());
        progress.setStatus("running");
        progress.setStartTime(LocalDateTime.now());
        progress.setTotalTables(project.getTableMappings().size());
        progress.setCompletedTables(0);
        progress.setTotalRows(0L);
        progress.setMigratedRows(0L);
        
        progressMap.put(project.getId(), progress);
        
        // Start migration in background thread
        new Thread(() -> executeMigration(project, settings, progress)).start();
        
        return progress;
    }
    
    private void executeMigration(Project project, AppSettings settings, MigrationProgress progress) {
        try {
            addLog(progress, "info", "Migration started", null);
            
            // Create target tables
            createTargetTables(project, progress);
            
            // Migrate data
            for (TableMapping tableMapping : project.getTableMappings()) {
                if (!tableMapping.getEnabled()) {
                    continue;
                }
                
                progress.setCurrentTable(tableMapping.getSourceTable());
                addLog(progress, "info", "Migrating table: " + tableMapping.getSourceTable(), null);
                
                migrateTable(project, tableMapping, settings, progress);
                
                progress.setCompletedTables(progress.getCompletedTables() + 1);
                addLog(progress, "success", "Completed table: " + tableMapping.getSourceTable(), null);
            }
            
            progress.setStatus("completed");
            progress.setCurrentTable(null);
            addLog(progress, "success", "Migration completed successfully", null);
            
        } catch (Exception e) {
            progress.setStatus("error");
            addLog(progress, "error", "Migration failed: " + e.getMessage(), e.toString());
        }
    }
    
    private void createTargetTables(Project project, MigrationProgress progress) throws SQLException {
        try (Connection targetConn = connectionManager.getConnection(project.getTargetConnection())) {
            // Disable auto-commit for table creation to ensure atomicity
            boolean originalAutoCommit = targetConn.getAutoCommit();
            targetConn.setAutoCommit(false);
            
            try {
                for (TableMapping tableMapping : project.getTableMappings()) {
                    if (!tableMapping.getEnabled()) {
                        continue;
                    }
                    
                    String createTableSql = generateCreateTableSql(tableMapping);
                    
                    try (Statement stmt = targetConn.createStatement()) {
                        // Drop table if exists (if truncateTarget is enabled)
                        String dropSql = String.format("DROP TABLE IF EXISTS %s.%s CASCADE",
                            tableMapping.getTargetSchema(), tableMapping.getTargetTable());
                        stmt.execute(dropSql);
                        
                        // Create table
                        stmt.execute(createTableSql);
                        addLog(progress, "info", "Created table: " + tableMapping.getTargetTable(), null);
                    }
                }
                
                // Commit all table creations
                targetConn.commit();
            } catch (SQLException e) {
                // Rollback on error
                targetConn.rollback();
                throw e;
            } finally {
                // Restore original auto-commit setting
                targetConn.setAutoCommit(originalAutoCommit);
            }
        }
    }
    
    private String generateCreateTableSql(TableMapping tableMapping) {
        StringBuilder sql = new StringBuilder();
        sql.append("CREATE TABLE ").append(quoteIdentifier(tableMapping.getTargetSchema()))
           .append(".").append(quoteIdentifier(tableMapping.getTargetTable())).append(" (");
        
        boolean first = true;
        for (ColumnMapping col : tableMapping.getColumnMappings()) {
            if (!first) sql.append(", ");
            first = false;
            
            sql.append(quoteIdentifier(col.getTargetColumn())).append(" ");
            
            // Clean up data type - remove invalid syntax like (n) without proper format
            String dataType = cleanDataType(col.getTargetDataType());
            sql.append(dataType);
            
            if (col.getNullable() != null && !col.getNullable()) {
                sql.append(" NOT NULL");
            }
        }
        
        sql.append(")");
        return sql.toString();
    }
    
    private String cleanDataType(String dataType) {
        if (dataType == null || dataType.isEmpty()) return "TEXT";
        
        // Remove invalid patterns like "(n)" without proper format
        // Keep valid patterns like "(255)", "(10,2)", etc.
        String cleaned = dataType.trim();
        
        // If it contains just "(n)" without numbers, remove it
        if (cleaned.matches(".*\\(n\\).*")) {
            cleaned = cleaned.replaceAll("\\(n\\)", "");
        }
        
        // If VARCHAR has no length, use TEXT instead (PostgreSQL requires length for VARCHAR)
        if (cleaned.equals("VARCHAR") || cleaned.equalsIgnoreCase("VARCHAR2")) {
            cleaned = "TEXT";
        }
        
        // NUMERIC without precision/scale is fine
        if (cleaned.equals("NUMERIC")) {
            cleaned = "NUMERIC";
        }
        
        return cleaned;
    }
    
    private String quoteIdentifier(String identifier) {
        // Quote identifier to handle reserved words and special characters
        return "\"" + identifier.replace("\"", "\"\"") + "\"";
    }
    
    private void migrateTable(Project project, TableMapping tableMapping, 
                             AppSettings settings, MigrationProgress progress) throws SQLException {
        try (Connection sourceConn = connectionManager.getConnection(project.getSourceConnection());
             Connection targetConn = connectionManager.getConnection(project.getTargetConnection())) {
            
            // Configure auto-commit based on settings
            boolean originalAutoCommit = targetConn.getAutoCommit();
            boolean useAutoCommit = settings.getAutoCommit() != null ? settings.getAutoCommit() : false;
            targetConn.setAutoCommit(useAutoCommit);
            
            // Build SELECT query
            StringBuilder selectCols = new StringBuilder();
            for (ColumnMapping col : tableMapping.getColumnMappings()) {
                if (selectCols.length() > 0) selectCols.append(", ");
                selectCols.append(col.getSourceColumn());
            }
            
            String selectSql = String.format("SELECT %s FROM %s.%s",
                selectCols.toString(),
                tableMapping.getSourceSchema(),
                tableMapping.getSourceTable());
            
            // Build INSERT query
            StringBuilder insertCols = new StringBuilder();
            StringBuilder insertVals = new StringBuilder();
            for (ColumnMapping col : tableMapping.getColumnMappings()) {
                if (insertCols.length() > 0) {
                    insertCols.append(", ");
                    insertVals.append(", ");
                }
                insertCols.append(col.getTargetColumn());
                insertVals.append("?");
            }
            
            String insertSql = String.format("INSERT INTO %s.%s (%s) VALUES (%s)",
                tableMapping.getTargetSchema(),
                tableMapping.getTargetTable(),
                insertCols.toString(),
                insertVals.toString());
            
            int batchSize = settings.getBatchSize() != null ? settings.getBatchSize() : 1000;
            int commitInterval = settings.getCommitInterval() != null ? settings.getCommitInterval() : 10000;
            
            try (PreparedStatement selectStmt = sourceConn.prepareStatement(selectSql);
                 PreparedStatement insertStmt = targetConn.prepareStatement(insertSql);
                 ResultSet rs = selectStmt.executeQuery()) {
                
                int rowCount = 0;
                long totalRows = 0;
                
                while (rs.next()) {
                    // Set parameters for INSERT
                    for (int i = 0; i < tableMapping.getColumnMappings().size(); i++) {
                        ColumnMapping col = tableMapping.getColumnMappings().get(i);
                        Object value = rs.getObject(i + 1);
                        String sourceType = col.getSourceDataType() != null ? 
                            col.getSourceDataType().toUpperCase() : "";
                        
                        // Handle NULL values
                        if (value == null) {
                            insertStmt.setObject(i + 1, null);
                            continue;
                        }
                        
                        // Check source data type first (more reliable than class name)
                        if (sourceType.contains("DATE") || sourceType.contains("TIMESTAMP")) {
                            try {
                                // Try to get as Timestamp - this handles Oracle TIMESTAMP types
                                Timestamp timestamp = rs.getTimestamp(i + 1);
                                insertStmt.setTimestamp(i + 1, timestamp);
                            } catch (SQLException e) {
                                // Fallback: use setObject with explicit TIMESTAMP type
                                try {
                                    insertStmt.setObject(i + 1, value, Types.TIMESTAMP);
                                } catch (SQLException e2) {
                                    // Last resort: try to convert the value
                                    if (value instanceof Timestamp) {
                                        insertStmt.setTimestamp(i + 1, (Timestamp) value);
                                    } else {
                                        throw new SQLException("Failed to set TIMESTAMP value: " + e2.getMessage(), e2);
                                    }
                                }
                            }
                        } else if (sourceType.contains("NUMBER") || sourceType.contains("NUMERIC")) {
                            // Handle numeric types
                            insertStmt.setObject(i + 1, value, Types.NUMERIC);
                        } else if (sourceType.contains("CLOB") || sourceType.contains("TEXT") || 
                                   sourceType.contains("LONG")) {
                            // Handle text types
                            insertStmt.setObject(i + 1, value, Types.CLOB);
                        } else if (sourceType.contains("BLOB") || sourceType.contains("RAW")) {
                            // Handle binary types
                            insertStmt.setObject(i + 1, value, Types.BLOB);
                        } else {
                            // Check if it's an Oracle-specific type by class name
                            String className = value.getClass().getName();
                            if (className.startsWith("oracle.sql.")) {
                                // For other Oracle types, try to infer from source type or use default
                                if (className.contains("TIMESTAMP") || className.contains("DATE")) {
                                    try {
                                        insertStmt.setTimestamp(i + 1, rs.getTimestamp(i + 1));
                                    } catch (SQLException e) {
                                        insertStmt.setObject(i + 1, value, Types.TIMESTAMP);
                                    }
                                } else {
                                    // Default: try setObject with inferred type
                                    insertStmt.setObject(i + 1, value);
                                }
                            } else {
                                // Standard Java types - use setObject normally
                                insertStmt.setObject(i + 1, value);
                            }
                        }
                    }
                    
                    insertStmt.addBatch();
                    rowCount++;
                    totalRows++;
                    
                    if (rowCount >= batchSize) {
                        insertStmt.executeBatch();
                        if (!useAutoCommit) {
                            targetConn.commit();
                        }
                        rowCount = 0;
                        
                        progress.setMigratedRows(progress.getMigratedRows() + batchSize);
                    }
                    
                    if (totalRows % commitInterval == 0) {
                        addLog(progress, "info", 
                            String.format("Migrated %d rows from %s", totalRows, tableMapping.getSourceTable()), null);
                    }
                }
                
                // Execute remaining batch
                if (rowCount > 0) {
                    insertStmt.executeBatch();
                    if (!useAutoCommit) {
                        targetConn.commit();
                    }
                    progress.setMigratedRows(progress.getMigratedRows() + rowCount);
                }
            } finally {
                // Restore original auto-commit setting (before connections close)
                targetConn.setAutoCommit(originalAutoCommit);
            }
        }
    }
    
    private void addLog(MigrationProgress progress, String level, String message, String details) {
        MigrationLog log = new MigrationLog();
        log.setId(UUID.randomUUID().toString());
        log.setTimestamp(LocalDateTime.now());
        log.setLevel(level);
        log.setMessage(message);
        log.setDetails(details);
        progress.getLogs().add(log);
        
        // Persist to database
        try {
            ProjectEntity project = projectRepository.findById(progress.getProjectId()).orElse(null);
            if (project != null) {
                MigrationLogEntity logEntity = new MigrationLogEntity();
                logEntity.setId(log.getId());
                logEntity.setTimestamp(log.getTimestamp());
                logEntity.setLevel(log.getLevel());
                logEntity.setMessage(log.getMessage());
                logEntity.setDetails(log.getDetails());
                logEntity.setProject(project);
                migrationLogRepository.save(logEntity);
            }
        } catch (Exception e) {
            // Log error but don't fail migration
            System.err.println("Failed to persist migration log: " + e.getMessage());
        }
    }
    
    public MigrationProgress getProgress(String projectId) {
        MigrationProgress progress = progressMap.get(projectId);
        if (progress == null) {
            progress = new MigrationProgress(projectId);
            // Load logs from database if available
            try {
                ProjectEntity project = projectRepository.findById(projectId).orElse(null);
                if (project != null) {
                    List<MigrationLogEntity> logEntities = migrationLogRepository
                        .findByProjectOrderByTimestampDesc(project);
                    progress.setLogs(logEntities.stream().map(this::toMigrationLog).collect(Collectors.toList()));
                }
            } catch (Exception e) {
                // Ignore errors loading logs
            }
        }
        return progress;
    }
    
    private MigrationLog toMigrationLog(MigrationLogEntity entity) {
        MigrationLog log = new MigrationLog();
        log.setId(entity.getId());
        log.setTimestamp(entity.getTimestamp());
        log.setLevel(entity.getLevel());
        log.setMessage(entity.getMessage());
        log.setDetails(entity.getDetails());
        return log;
    }
    
    public void pauseMigration(String projectId) {
        MigrationProgress progress = progressMap.get(projectId);
        if (progress != null && "running".equals(progress.getStatus())) {
            progress.setStatus("paused");
            addLog(progress, "info", "Migration paused", null);
        }
    }
    
    public void resumeMigration(String projectId) {
        MigrationProgress progress = progressMap.get(projectId);
        if (progress != null && "paused".equals(progress.getStatus())) {
            progress.setStatus("running");
            addLog(progress, "info", "Migration resumed", null);
        }
    }
}

