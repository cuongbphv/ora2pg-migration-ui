package com.ora2pg.migration.service;

import com.ora2pg.migration.entity.MigrationLogEntity;
import com.ora2pg.migration.entity.MigrationProgressEntity;
import com.ora2pg.migration.entity.ProjectEntity;
import com.ora2pg.migration.model.*;
import com.ora2pg.migration.repository.MigrationLogRepository;
import com.ora2pg.migration.repository.MigrationProgressRepository;
import com.ora2pg.migration.repository.ProjectRepository;
import com.ora2pg.migration.util.DatabaseConnectionManager;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;

@Slf4j
@Service
public class MigrationService {
    
    @Autowired
    private DatabaseConnectionManager connectionManager;
    
    @Autowired
    private MigrationLogRepository migrationLogRepository;
    
    @Autowired
    private ProjectRepository projectRepository;
    
    @Autowired
    private com.ora2pg.migration.repository.TableMappingRepository tableMappingRepository;
    
    @Autowired
    private MigrationProgressRepository migrationProgressRepository;
    
    @Autowired
    private ProjectService projectService;
    
    @Autowired
    private SettingsService settingsService;
    
    private final ConcurrentHashMap<String, MigrationProgress> progressMap = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Thread> executionThreads = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, AtomicBoolean> pauseFlags = new ConcurrentHashMap<>();
    
    @Transactional
    public MigrationProgress startMigration(Project project, AppSettings settings) {
        MigrationProgress progress = new MigrationProgress(project.getId());
        progress.setStatus("running");
        progress.setStartTime(LocalDateTime.now());
        progress.setTotalTables(project.getTableMappings().size());
        progress.setCompletedTables(0);
        
        // Calculate total rows from source tables (considering filter conditions)
        long totalRows = calculateTotalRows(project);
        progress.setTotalRows(totalRows);
        progress.setMigratedRows(0L);
        
        // Save to database
        saveProgressToDatabase(project.getId(), progress);
        
        progressMap.put(project.getId(), progress);
        pauseFlags.put(project.getId(), new AtomicBoolean(false));
        
        // Start migration in background thread
        Thread executionThread = new Thread(() -> executeMigration(project, settings, progress));
        executionThread.setName("Migration-" + project.getId());
        executionThreads.put(project.getId(), executionThread);
        executionThread.start();
        
        return progress;
    }
    
    /**
     * Calculate total rows to migrate from source tables, considering filter conditions
     */
    private long calculateTotalRows(Project project) {
        long totalRows = 0L;
        try (Connection sourceConn = connectionManager.getConnection(project.getSourceConnection())) {
            for (TableMapping tableMapping : project.getTableMappings()) {
                if (!tableMapping.getEnabled()) {
                    continue;
                }
                
                try {
                    // Build COUNT query with filter condition
                    String countSql = String.format("SELECT COUNT(*) FROM %s.%s",
                        quoteIdentifier(tableMapping.getSourceSchema()),
                        quoteIdentifier(tableMapping.getSourceTable()));
                    
                    // Add filter condition if specified
                    if (tableMapping.getFilterCondition() != null && !tableMapping.getFilterCondition().trim().isEmpty()) {
                        String filter = tableMapping.getFilterCondition().trim();
                        if (!filter.toUpperCase().startsWith("WHERE")) {
                            countSql += " WHERE " + filter;
                        } else {
                            countSql += " " + filter;
                        }
                    }
                    
                    try (Statement stmt = sourceConn.createStatement();
                         ResultSet rs = stmt.executeQuery(countSql)) {
                        if (rs.next()) {
                            totalRows += rs.getLong(1);
                        }
                    }
                } catch (SQLException e) {
                    log.warn("Failed to count rows for table {}.{}: {}", 
                        tableMapping.getSourceSchema(), tableMapping.getSourceTable(), e.getMessage());
                    // Continue with other tables even if one fails
                }
            }
        } catch (SQLException e) {
            log.error("Failed to calculate total rows", e);
        }
        return totalRows;
    }
    
    /**
     * Count actual migrated rows in target database
     * @param project The project
     * @param targetConn Optional existing connection to reuse. If null, a new connection will be opened.
     */
    private long countMigratedRows(Project project, Connection targetConn) {
        long migratedRows = 0L;
        boolean shouldCloseConnection = false;
        
        try {
            if (targetConn == null) {
                targetConn = connectionManager.getConnection(project.getTargetConnection());
                shouldCloseConnection = true;
            }
            
            for (TableMapping tableMapping : project.getTableMappings()) {
                if (!tableMapping.getEnabled()) {
                    continue;
                }
                
                // Only count rows for tables that have been migrated
                if (!"migrated".equals(tableMapping.getStatus())) {
                    continue;
                }
                
                try {
                    String countSql = String.format("SELECT COUNT(*) FROM %s.%s",
                        quoteIdentifier(tableMapping.getTargetSchema()),
                        quoteIdentifier(tableMapping.getTargetTable()));
                    
                    try (Statement stmt = targetConn.createStatement();
                         ResultSet rs = stmt.executeQuery(countSql)) {
                        if (rs.next()) {
                            migratedRows += rs.getLong(1);
                        }
                    }
                } catch (SQLException e) {
                    log.warn("Failed to count migrated rows for table {}.{}: {}", 
                        tableMapping.getTargetSchema(), tableMapping.getTargetTable(), e.getMessage());
                    // Continue with other tables even if one fails
                }
            }
        } catch (SQLException e) {
            log.error("Failed to count migrated rows", e);
        } finally {
            if (shouldCloseConnection && targetConn != null) {
                try {
                    targetConn.close();
                } catch (SQLException e) {
                    log.warn("Failed to close connection", e);
                }
            }
        }
        return migratedRows;
    }
    
    /**
     * Count actual migrated rows in target database (opens new connection)
     */
    private long countMigratedRows(Project project) {
        return countMigratedRows(project, null);
    }
    
    /**
     * Count rows for a specific table in target database
     */
    private long countTableRows(Connection targetConn, String schema, String tableName) {
        try {
            String countSql = String.format("SELECT COUNT(*) FROM %s.%s",
                quoteIdentifier(schema),
                quoteIdentifier(tableName));
            
            try (Statement stmt = targetConn.createStatement();
                 ResultSet rs = stmt.executeQuery(countSql)) {
                if (rs.next()) {
                    return rs.getLong(1);
                }
            }
        } catch (SQLException e) {
            log.warn("Failed to count rows for table {}.{}: {}", schema, tableName, e.getMessage());
        }
        return 0L;
    }
    
    private void executeMigration(Project project, AppSettings settings, MigrationProgress progress) {
        String projectId = project.getId();
        AtomicBoolean pauseFlag = pauseFlags.get(projectId);
        if (pauseFlag == null) {
            pauseFlag = new AtomicBoolean(false);
            pauseFlags.put(projectId, pauseFlag);
        }
        
        try {
            // Check if migration was already started (resume scenario)
            boolean isResume = progress.getCompletedTables() > 0 || 
                              project.getTableMappings().stream().anyMatch(t -> "migrated".equals(t.getStatus()));
            
            if (!isResume) {
                addLog(progress, "info", "Migration started", null);
                // Create target tables only on first start
                createTargetTables(project, progress);
            } else {
                addLog(progress, "info", "Migration resumed from table " + (progress.getCompletedTables() + 1), null);
            }
            
            // Migrate data - skip already completed tables
            for (TableMapping tableMapping : project.getTableMappings()) {
                if (!tableMapping.getEnabled()) {
                    continue;
                }
                
                // Skip already migrated tables
                if ("migrated".equals(tableMapping.getStatus())) {
                    continue;
                }
                
                // Check for pause before each table
                while (pauseFlag.get() && "paused".equals(progress.getStatus())) {
                    try {
                        Thread.sleep(100); // Wait 100ms and check again
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        progress.setStatus("error");
                        saveProgressToDatabase(progress.getProjectId(), progress);
                        addLog(progress, "error", "Migration interrupted", null);
                        return;
                    }
                }
                
                // Check if status changed to error or completed
                if (!"running".equals(progress.getStatus())) {
                    break;
                }
                
                progress.setCurrentTable(tableMapping.getSourceTable());
                addLog(progress, "info", "Migrating table: " + tableMapping.getSourceTable(), null);
                
                try {
                    migrateTable(project, tableMapping, settings, progress, pauseFlag);
                    
                    // Update table status to "migrated" after successful migration
                    tableMapping.setStatus("migrated");
                    updateTableMappingStatus(project.getId(), tableMapping.getId(), "migrated");
                    
                    progress.setCompletedTables(progress.getCompletedTables() + 1);
                    // Note: migratedRows is updated within migrateTable() using the existing connection
                    saveProgressToDatabase(progress.getProjectId(), progress);
                    
                    // Count actual migrated rows for logging (using a new connection since migrateTable closed its connection)
                    long actualMigratedRows = 0L;
                    try {
                        try (Connection targetConn = connectionManager.getConnection(project.getTargetConnection())) {
                            actualMigratedRows = countTableRows(targetConn, 
                                tableMapping.getTargetSchema(), 
                                tableMapping.getTargetTable());
                        }
                    } catch (SQLException e) {
                        log.warn("Failed to count migrated rows for table {}.{}: {}", 
                            tableMapping.getTargetSchema(), tableMapping.getTargetTable(), e.getMessage());
                    }
                    
                    addLog(progress, "success", 
                        String.format("Completed table: %s (%d rows migrated)", 
                            tableMapping.getSourceTable(), actualMigratedRows), null);
                } catch (Exception e) {
                    // Update table status to "error" if migration fails
                    tableMapping.setStatus("error");
                    updateTableMappingStatus(project.getId(), tableMapping.getId(), "error");
                    addLog(progress, "error", "Failed to migrate table: " + tableMapping.getSourceTable() + " - " + e.getMessage(), e.toString());
                    throw e; // Re-throw to stop migration
                }
            }
            
            progress.setStatus("completed");
            progress.setCurrentTable(null);
            saveProgressToDatabase(progress.getProjectId(), progress);
            addLog(progress, "success", "Migration completed successfully", null);
            
        } catch (Exception e) {
            progress.setStatus("error");
            saveProgressToDatabase(progress.getProjectId(), progress);
            addLog(progress, "error", "Migration failed: " + e.getMessage(), e.toString());
        } finally {
            // Clean up thread reference
            executionThreads.remove(projectId);
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
                        // Handle drop/truncate based on table mapping settings
                        if (tableMapping.getDropBeforeInsert() != null && tableMapping.getDropBeforeInsert()) {
                            String dropSql = String.format("DROP TABLE IF EXISTS %s.%s CASCADE",
                                quoteIdentifier(tableMapping.getTargetSchema()), 
                                quoteIdentifier(tableMapping.getTargetTable()));
                            stmt.execute(dropSql);
                            addLog(progress, "info", "Dropped table: " + tableMapping.getTargetTable(), null);
                        }
                        
                        // Create table (only if it doesn't exist or was dropped)
                        if (tableMapping.getDropBeforeInsert() == null || !tableMapping.getDropBeforeInsert()) {
                            // Check if table exists
                            String checkTableSql = String.format(
                                "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = '%s' AND table_name = '%s')",
                                tableMapping.getTargetSchema(), tableMapping.getTargetTable());
                            boolean tableExists = false;
                            try (var rs = stmt.executeQuery(checkTableSql)) {
                                if (rs.next()) {
                                    tableExists = rs.getBoolean(1);
                                }
                            }
                            
                            if (!tableExists) {
                                stmt.execute(createTableSql);
                                addLog(progress, "info", "Created table: " + tableMapping.getTargetTable(), null);
                            } else {
                                addLog(progress, "info", "Table already exists: " + tableMapping.getTargetTable(), null);
                            }
                        } else {
                            stmt.execute(createTableSql);
                            addLog(progress, "info", "Created table: " + tableMapping.getTargetTable(), null);
                        }
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
                             AppSettings settings, MigrationProgress progress, AtomicBoolean pauseFlag) throws SQLException {
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
            
            // Build SELECT query with optional filter condition
            String selectSql = String.format("SELECT %s FROM %s.%s",
                selectCols.toString(),
                quoteIdentifier(tableMapping.getSourceSchema()),
                quoteIdentifier(tableMapping.getSourceTable()));
            
            // Add filter condition if specified
            if (tableMapping.getFilterCondition() != null && !tableMapping.getFilterCondition().trim().isEmpty()) {
                String filter = tableMapping.getFilterCondition().trim();
                // Ensure it starts with WHERE if not already present
                if (!filter.toUpperCase().startsWith("WHERE")) {
                    selectSql += " WHERE " + filter;
                } else {
                    selectSql += " " + filter;
                }
            }
            
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
            
            // Handle truncate before insert if specified
            if (tableMapping.getTruncateBeforeInsert() != null && tableMapping.getTruncateBeforeInsert()) {
                try (Statement truncateStmt = targetConn.createStatement()) {
                    String truncateSql = String.format("TRUNCATE TABLE %s.%s",
                        quoteIdentifier(tableMapping.getTargetSchema()),
                        quoteIdentifier(tableMapping.getTargetTable()));
                    truncateStmt.execute(truncateSql);
                    addLog(progress, "info", "Truncated table: " + tableMapping.getTargetTable(), null);
                }
            }
            
            String insertSql = String.format("INSERT INTO %s.%s (%s) VALUES (%s)",
                quoteIdentifier(tableMapping.getTargetSchema()),
                quoteIdentifier(tableMapping.getTargetTable()),
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
                    // Check for pause during row processing
                    while (pauseFlag != null && pauseFlag.get() && "paused".equals(progress.getStatus())) {
                        try {
                            Thread.sleep(100);
                        } catch (InterruptedException e) {
                            Thread.currentThread().interrupt();
                            throw new SQLException("Migration interrupted", e);
                        }
                    }
                    
                    // Check if status changed
                    if (!"running".equals(progress.getStatus())) {
                        break;
                    }
                    
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
                        } else if (sourceType.contains("CLOB") || sourceType.contains("TEXT")) {
                            // Handle text types (but not LONG RAW - that's binary)
                            insertStmt.setObject(i + 1, value, Types.CLOB);
                        } else if (sourceType.contains("BLOB") || sourceType.contains("RAW") || 
                                   sourceType.contains("LONG RAW") || sourceType.equals("LONG RAW")) {
                            // Handle binary types: BLOB, RAW, LONG RAW
                            try {
                                // Check if value is already a byte array
                                if (value instanceof byte[]) {
                                    insertStmt.setBytes(i + 1, (byte[]) value);
                                } else if (value instanceof String) {
                                    // If value is a String (hex), convert it to byte array
                                    String hexString = (String) value;
                                    // Remove any whitespace
                                    hexString = hexString.replaceAll("\\s", "");
                                    // Convert hex string to byte array
                                    byte[] bytes = hexStringToByteArray(hexString);
                                    insertStmt.setBytes(i + 1, bytes);
                                } else {
                                    // Try to get as binary data from ResultSet
                                    if (sourceType.contains("LONG RAW") || sourceType.equals("LONG RAW")) {
                                        // LONG RAW can be very large, use getBytes or getBinaryStream
                                        try {
                                            byte[] bytes = rs.getBytes(i + 1);
                                            if (bytes != null) {
                                                insertStmt.setBytes(i + 1, bytes);
                                            } else {
                                                insertStmt.setObject(i + 1, null);
                                            }
                                        } catch (SQLException e) {
                                            // Fallback: try getBinaryStream for very large data
                                            try (java.io.InputStream is = rs.getBinaryStream(i + 1)) {
                                                if (is != null) {
                                                    byte[] buffer = new byte[8192];
                                                    java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
                                                    int bytesRead;
                                                    while ((bytesRead = is.read(buffer)) != -1) {
                                                        baos.write(buffer, 0, bytesRead);
                                                    }
                                                    insertStmt.setBytes(i + 1, baos.toByteArray());
                                                } else {
                                                    insertStmt.setObject(i + 1, null);
                                                }
                                            } catch (java.io.IOException ioE) {
                                                throw new SQLException("Failed to read LONG RAW data: " + ioE.getMessage(), ioE);
                                            }
                                        }
                                    } else {
                                        // Regular RAW or BLOB
                                        try {
                                            byte[] bytes = rs.getBytes(i + 1);
                                            if (bytes != null) {
                                                insertStmt.setBytes(i + 1, bytes);
                                            } else {
                                                insertStmt.setObject(i + 1, null);
                                            }
                                        } catch (SQLException e) {
                                            // If we can't get bytes, try to convert the object
                                            if (value != null) {
                                                // Try to convert to byte array if possible
                                                try {
                                                    byte[] bytes = objectToByteArray(value);
                                                    insertStmt.setBytes(i + 1, bytes);
                                                } catch (Exception convE) {
                                                    throw new SQLException("Failed to convert RAW/BLOB data: " + e.getMessage(), e);
                                                }
                                            } else {
                                                insertStmt.setObject(i + 1, null);
                                            }
                                        }
                                    }
                                }
                            } catch (SQLException e) {
                                throw new SQLException("Failed to set RAW/LONG RAW/BLOB value: " + e.getMessage(), e);
                            }
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
                        
                        // Count actual migrated rows from target database for accuracy
                        long actualMigratedRows = countTableRows(targetConn,
                            tableMapping.getTargetSchema(),
                            tableMapping.getTargetTable());
                        // Update with actual count from database (reuse existing connection)
                        progress.setMigratedRows(countMigratedRows(project, targetConn));
                    }
                    
                    if (totalRows % commitInterval == 0) {
                        // Count actual migrated rows for accurate logging (reuse existing connection)
                        long actualMigratedRows = 0L;
                        actualMigratedRows = countTableRows(targetConn,
                            tableMapping.getTargetSchema(),
                            tableMapping.getTargetTable());
                        // Update progress with actual count (reuse existing connection)
                        progress.setMigratedRows(countMigratedRows(project, targetConn));
                        addLog(progress, "info", 
                            String.format("Migrated %d rows from %s (total: %d)", 
                                actualMigratedRows, tableMapping.getSourceTable(), totalRows), null);
                        log.info("Migrated {} rows from {} (total processed: {})", 
                            actualMigratedRows, tableMapping.getSourceTable(), totalRows);
                    }
                }
                
                // Execute remaining batch
                if (rowCount > 0) {
                    insertStmt.executeBatch();
                    if (!useAutoCommit) {
                        targetConn.commit();
                    }
                    // Count actual migrated rows from target database for accuracy (reuse existing connection)
                    long actualMigratedRows = countTableRows(targetConn,
                        tableMapping.getTargetSchema(),
                        tableMapping.getTargetTable());
                    // Update with actual count from database (reuse existing connection)
                    progress.setMigratedRows(countMigratedRows(project, targetConn));
                    // Periodically save progress to database
                    if (progress.getMigratedRows() % 10000 == 0) {
                        saveProgressToDatabase(progress.getProjectId(), progress);
                    }
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
        // First check in-memory cache
        MigrationProgress progress = progressMap.get(projectId);
        
        if (progress == null) {
            // Try to load from database
            try {
                ProjectEntity projectEntity = projectRepository.findById(projectId).orElse(null);
                if (projectEntity != null) {
                    Project project = projectService.getProjectById(projectId);
                    if (project == null) {
                        progress = new MigrationProgress(projectId);
                        return progress;
                    }
                    
                    MigrationProgressEntity entity = migrationProgressRepository
                        .findByProject(projectEntity)
                        .orElse(null);
                    
                    if (entity != null) {
                        // Load from database
                        progress = entityToModel(entity);
                    } else {
                        // No progress in DB, calculate from table mappings
                        progress = calculateProgressFromTableMappings(projectEntity);
                    }
                    
                    // Refresh row counts from actual databases for accuracy
                    try {
                        long totalRows = calculateTotalRows(project);
                        long migratedRows = countMigratedRows(project);
                        progress.setTotalRows(totalRows);
                        progress.setMigratedRows(migratedRows);
                    } catch (Exception e) {
                        log.warn("Failed to refresh row counts: {}", e.getMessage());
                        // Keep existing counts if refresh fails
                    }
                    
                    // Load logs from database
                    List<MigrationLogEntity> logEntities = migrationLogRepository
                        .findByProjectOrderByTimestampDesc(projectEntity);
                    progress.setLogs(logEntities.stream().map(this::toMigrationLog).collect(Collectors.toList()));
                } else {
                    progress = new MigrationProgress(projectId);
                }
            } catch (Exception e) {
                log.error("Failed to load migration progress from database", e);
                progress = new MigrationProgress(projectId);
            }
        } else {
            // Even if in memory, refresh row counts periodically for accuracy
            // Only refresh if migration is not currently running (to avoid performance impact)
            if (!"running".equals(progress.getStatus())) {
                try {
                    Project project = projectService.getProjectById(projectId);
                    if (project != null) {
                        long totalRows = calculateTotalRows(project);
                        long migratedRows = countMigratedRows(project);
                        progress.setTotalRows(totalRows);
                        progress.setMigratedRows(migratedRows);
                    }
                } catch (Exception e) {
                    // Silently fail - keep existing counts
                }
            }
        }
        
        return progress;
    }
    
    private MigrationProgress calculateProgressFromTableMappings(ProjectEntity projectEntity) {
        MigrationProgress progress = new MigrationProgress(projectEntity.getId());
        
        // Convert entity to model for calculations
        Project project = projectService.getProjectById(projectEntity.getId());
        if (project == null) {
            return progress;
        }
        
        // Calculate from table mappings
        List<com.ora2pg.migration.entity.TableMappingEntity> tableMappings = 
            projectEntity.getTableMappings();
        
        int totalTables = tableMappings.size();
        int completedTables = 0;
        
        for (com.ora2pg.migration.entity.TableMappingEntity mapping : tableMappings) {
            if ("migrated".equals(mapping.getStatus())) {
                completedTables++;
            }
        }
        
        // Calculate total rows from source (considering filter conditions)
        long totalRows = calculateTotalRows(project);
        
        // Count actual migrated rows in target database
        long migratedRows = countMigratedRows(project);
        
        progress.setTotalTables(totalTables);
        progress.setCompletedTables(completedTables);
        progress.setTotalRows(totalRows);
        progress.setMigratedRows(migratedRows);
        
        // Determine status based on table mappings
        if (completedTables == 0) {
            progress.setStatus("idle");
        } else if (completedTables == totalTables) {
            progress.setStatus("completed");
        } else {
            progress.setStatus("paused"); // Assume paused if partially completed
        }
        
        return progress;
    }
    
    @Transactional
    protected void saveProgressToDatabase(String projectId, MigrationProgress progress) {
        try {
            ProjectEntity project = projectRepository.findById(projectId).orElse(null);
            if (project == null) {
                return;
            }
            
            MigrationProgressEntity entity = migrationProgressRepository
                .findByProject(project)
                .orElse(new MigrationProgressEntity());
            
            if (entity.getId() == null) {
                entity.setProject(project);
            }
            
            entity.setStatus(progress.getStatus());
            entity.setTotalTables(progress.getTotalTables());
            entity.setCompletedTables(progress.getCompletedTables());
            entity.setTotalRows(progress.getTotalRows());
            entity.setMigratedRows(progress.getMigratedRows());
            entity.setCurrentTable(progress.getCurrentTable());
            entity.setStartTime(progress.getStartTime());
            entity.setEstimatedEndTime(progress.getEstimatedEndTime());
            
            migrationProgressRepository.save(entity);
        } catch (Exception e) {
            log.error("Failed to save migration progress to database", e);
            // Don't throw - migration should continue even if saving fails
        }
    }
    
    private MigrationProgress entityToModel(MigrationProgressEntity entity) {
        MigrationProgress progress = new MigrationProgress(entity.getProject().getId());
        progress.setStatus(entity.getStatus());
        progress.setTotalTables(entity.getTotalTables());
        progress.setCompletedTables(entity.getCompletedTables());
        progress.setTotalRows(entity.getTotalRows());
        progress.setMigratedRows(entity.getMigratedRows());
        progress.setCurrentTable(entity.getCurrentTable());
        progress.setStartTime(entity.getStartTime());
        progress.setEstimatedEndTime(entity.getEstimatedEndTime());
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
        if (progress == null) {
            progress = getProgress(projectId);
            progressMap.put(projectId, progress);
        }
        if (progress != null && "running".equals(progress.getStatus())) {
            progress.setStatus("paused");
            saveProgressToDatabase(projectId, progress);
            
            // Set pause flag
            AtomicBoolean pauseFlag = pauseFlags.get(projectId);
            if (pauseFlag == null) {
                pauseFlag = new AtomicBoolean(true);
                pauseFlags.put(projectId, pauseFlag);
            } else {
                pauseFlag.set(true);
            }
            
            addLog(progress, "info", "Migration paused", null);
        }
    }
    
    public void resumeMigration(String projectId) {
        MigrationProgress progress = progressMap.get(projectId);
        if (progress == null) {
            progress = getProgress(projectId);
            progressMap.put(projectId, progress);
        }
        if (progress != null && "paused".equals(progress.getStatus())) {
            // Clear pause flag
            AtomicBoolean pauseFlag = pauseFlags.get(projectId);
            if (pauseFlag == null) {
                pauseFlag = new AtomicBoolean(false);
                pauseFlags.put(projectId, pauseFlag);
            } else {
                pauseFlag.set(false);
            }
            
            // Check if execution thread is still alive
            Thread executionThread = executionThreads.get(projectId);
            if (executionThread == null || !executionThread.isAlive()) {
                // Thread is not alive, need to restart migration from current position
                try {
                    Project project = projectService.getProjectById(projectId);
                    if (project != null) {
                        AppSettings settings = settingsService.getSettings();
                        progress.setStatus("running");
                        saveProgressToDatabase(projectId, progress);
                        
                        // Restart execution thread
                        MigrationProgress finalProgress = progress;
                        Thread newThread = new Thread(() -> executeMigration(project, settings, finalProgress));
                        newThread.setName("Migration-" + projectId);
                        executionThreads.put(projectId, newThread);
                        newThread.start();
                        
                        addLog(progress, "info", "Migration resumed - execution thread restarted", null);
                    }
                } catch (Exception e) {
                    log.error("Failed to restart migration thread", e);
                    progress.setStatus("error");
                    saveProgressToDatabase(projectId, progress);
                    addLog(progress, "error", "Failed to resume migration: " + e.getMessage(), null);
                }
            } else {
                // Thread is alive, just change status
                progress.setStatus("running");
                saveProgressToDatabase(projectId, progress);
                addLog(progress, "info", "Migration resumed", null);
            }
        }
    }
    
    /**
     * Convert hexadecimal string to byte array
     * Handles hex strings like "2B2D2D2D..." to byte array
     */
    private byte[] hexStringToByteArray(String hex) {
        if (hex == null || hex.isEmpty()) {
            return new byte[0];
        }
        
        // Remove any whitespace and ensure even length
        hex = hex.replaceAll("\\s", "").toUpperCase();
        if (hex.length() % 2 != 0) {
            // Pad with leading zero if odd length
            hex = "0" + hex;
        }
        
        int len = hex.length();
        byte[] data = new byte[len / 2];
        for (int i = 0; i < len; i += 2) {
            data[i / 2] = (byte) ((Character.digit(hex.charAt(i), 16) << 4)
                                 + Character.digit(hex.charAt(i + 1), 16));
        }
        return data;
    }
    
    /**
     * Convert object to byte array for binary types
     * Handles various Oracle binary types
     */
    private byte[] objectToByteArray(Object value) throws Exception {
        if (value == null) {
            return null;
        }
        
        if (value instanceof byte[]) {
            return (byte[]) value;
        }
        
        if (value instanceof String) {
            // Try to parse as hex string
            return hexStringToByteArray((String) value);
        }
        
        // For Oracle-specific types, try to get bytes
        String className = value.getClass().getName();
        if (className.startsWith("oracle.sql.")) {
            if (className.contains("RAW")) {
                // Try to get bytes from Oracle RAW
                try {
                    java.lang.reflect.Method getBytesMethod = value.getClass().getMethod("getBytes");
                    return (byte[]) getBytesMethod.invoke(value);
                } catch (Exception e) {
                    // Fallback: convert to string and parse as hex
                    String strValue = value.toString();
                    return hexStringToByteArray(strValue);
                }
            }
        }
        
        // Last resort: convert to string and try hex parsing
        String strValue = value.toString();
        return hexStringToByteArray(strValue);
    }
    
    private void updateTableMappingStatus(String projectId, String tableMappingId, String status) {
        try {
            tableMappingRepository.updateStatus(tableMappingId, status);
        } catch (Exception e) {
            // Log error but don't fail migration
            System.err.println("Failed to update table mapping status: " + e.getMessage());
        }
    }
}

