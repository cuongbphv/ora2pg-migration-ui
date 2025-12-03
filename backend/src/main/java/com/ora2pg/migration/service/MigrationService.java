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
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
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
    
    private static class ChunkRange {
        private final long startInclusive;
        private final long endInclusive;
        
        private ChunkRange(long startInclusive, long endInclusive) {
            this.startInclusive = startInclusive;
            this.endInclusive = endInclusive;
        }
    }
    
    @Transactional
    public MigrationProgress startMigration(Project project, AppSettings settings) {
        MigrationProgress progress = new MigrationProgress(project.getId());
        progress.setStatus("running");
        progress.setStartTime(LocalDateTime.now());
        int enabledTables = (int) project.getTableMappings()
            .stream()
            .filter(TableMapping::getEnabled)
            .count();
        progress.setTotalTables(enabledTables);
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
    
    private int resolveParallelTables(AppSettings settings) {
        if (settings == null || settings.getParallelJobs() == null || settings.getParallelJobs() < 1) {
            return 1;
        }
        return Math.max(1, settings.getParallelJobs());
    }
    
    private void incrementMigratedRows(MigrationProgress progress, long delta) {
        if (delta <= 0) {
            return;
        }
        synchronized (progress) {
            progress.setMigratedRows(progress.getMigratedRows() + delta);
        }
        if (progress.getMigratedRows() % 10000 == 0) {
            saveProgressToDatabase(progress.getProjectId(), progress);
        }
    }
    
    private void incrementCompletedTables(MigrationProgress progress) {
        synchronized (progress) {
            progress.setCompletedTables(progress.getCompletedTables() + 1);
        }
    }
    
    private void waitForResume(MigrationProgress progress, AtomicBoolean pauseFlag) throws InterruptedException {
        while (pauseFlag.get() && "paused".equals(progress.getStatus())) {
            Thread.sleep(100);
        }
    }
    
    private void setCurrentTable(MigrationProgress progress, String tableName) {
        synchronized (progress) {
            progress.setCurrentTable(tableName);
        }
    }
    
    private void prepareTableForMigration(Project project, TableMapping tableMapping, MigrationProgress progress) throws SQLException {
        boolean drop = Boolean.TRUE.equals(tableMapping.getDropBeforeInsert());
        boolean truncate = Boolean.TRUE.equals(tableMapping.getTruncateBeforeInsert());
        if (!drop && !truncate) {
            return;
        }
        
        try (Connection targetConn = connectionManager.getConnection(project.getTargetConnection());
             Statement stmt = targetConn.createStatement()) {
            if (drop) {
                String dropSql = String.format("DROP TABLE IF EXISTS %s.%s CASCADE",
                    quoteIdentifier(tableMapping.getTargetSchema()),
                    quoteIdentifier(tableMapping.getTargetTable()));
                stmt.execute(dropSql);
                addLog(progress, "info", "Dropped table: " + tableMapping.getTargetTable(), null);
                
                String createSql = generateCreateTableSql(tableMapping);
                stmt.execute(createSql);
                addLog(progress, "info", "Recreated table: " + tableMapping.getTargetTable(), null);
            } else if (truncate) {
                String truncateSql = String.format("TRUNCATE TABLE %s.%s",
                    quoteIdentifier(tableMapping.getTargetSchema()),
                    quoteIdentifier(tableMapping.getTargetTable()));
                stmt.execute(truncateSql);
                addLog(progress, "info", "Truncated table: " + tableMapping.getTargetTable(), null);
            }
        }
    }
    
    private boolean shouldUseChunking(TableMapping tableMapping) {
        return tableMapping.getPartitionColumn() != null &&
            !tableMapping.getPartitionColumn().trim().isEmpty() &&
            tableMapping.getChunkWorkers() != null && tableMapping.getChunkWorkers() > 1 &&
            tableMapping.getChunkSize() != null && tableMapping.getChunkSize() > 0;
    }
    
    private ColumnMapping findPartitionColumnMapping(TableMapping tableMapping) {
        if (tableMapping.getColumnMappings() == null) {
            return null;
        }
        String partitionColumn = tableMapping.getPartitionColumn();
        if (partitionColumn == null) {
            return null;
        }
        return tableMapping.getColumnMappings().stream()
            .filter(cm -> cm.getSourceColumn() != null && cm.getSourceColumn().equalsIgnoreCase(partitionColumn))
            .findFirst()
            .orElse(null);
    }
    
    private boolean isChunkableColumnType(String dataType) {
        if (dataType == null) {
            return false;
        }
        String normalized = dataType.toUpperCase();
        return normalized.contains("INT") ||
               normalized.contains("NUMBER") ||
               normalized.contains("DECIMAL") ||
               normalized.contains("NUMERIC") ||
               normalized.contains("BIGINT") ||
               normalized.contains("SMALLINT");
    }
    
    private String normalizeFilterCondition(String filterCondition) {
        if (filterCondition == null) {
            return "";
        }
        String trimmed = filterCondition.trim();
        if (trimmed.isEmpty()) {
            return "";
        }
        String upper = trimmed.toUpperCase();
        if (upper.startsWith("WHERE ")) {
            return trimmed.substring(5).trim();
        }
        return trimmed;
    }
    
    private String buildWhereClause(String filterCondition, String extraCondition) {
        List<String> clauses = new ArrayList<>();
        String normalizedFilter = normalizeFilterCondition(filterCondition);
        if (!normalizedFilter.isEmpty()) {
            clauses.add("(" + normalizedFilter + ")");
        }
        if (extraCondition != null && !extraCondition.trim().isEmpty()) {
            clauses.add("(" + extraCondition + ")");
        }
        if (clauses.isEmpty()) {
            return "";
        }
        return " WHERE " + String.join(" AND ", clauses);
    }
    
    private Long parseLongSafe(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        try {
            return Long.parseLong(value.trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }
    
    private List<ChunkRange> buildChunkRanges(Project project, TableMapping tableMapping) throws SQLException {
        if (tableMapping.getChunkSize() == null || tableMapping.getChunkSize() <= 0) {
            return Collections.emptyList();
        }
        
        Long minValue = parseLongSafe(tableMapping.getPartitionMinValue());
        Long maxValue = parseLongSafe(tableMapping.getPartitionMaxValue());
        
        if (minValue == null || maxValue == null) {
            Long[] bounds = fetchPartitionBounds(project, tableMapping);
            if (minValue == null) {
                minValue = bounds[0];
            }
            if (maxValue == null) {
                maxValue = bounds[1];
            }
        }
        
        if (minValue == null || maxValue == null) {
            return Collections.emptyList();
        }
        
        if (maxValue < minValue) {
            long tmp = maxValue;
            maxValue = minValue;
            minValue = tmp;
        }
        
        long chunkSize = tableMapping.getChunkSize();
        if (chunkSize <= 0) {
            return Collections.emptyList();
        }
        
        List<ChunkRange> ranges = new ArrayList<>();
        for (long start = minValue; start <= maxValue; start += chunkSize) {
            long end = Math.min(start + chunkSize - 1, maxValue);
            ranges.add(new ChunkRange(start, end));
        }
        return ranges;
    }
    
    private Long[] fetchPartitionBounds(Project project, TableMapping tableMapping) throws SQLException {
        String partitionColumn = tableMapping.getPartitionColumn();
        if (partitionColumn == null || partitionColumn.trim().isEmpty()) {
            return new Long[]{null, null};
        }
        
        String columnIdentifier = quoteIdentifier(partitionColumn);
        StringBuilder sql = new StringBuilder();
        sql.append("SELECT MIN(").append(columnIdentifier).append(") AS min_val, MAX(")
            .append(columnIdentifier).append(") AS max_val FROM ")
            .append(quoteIdentifier(tableMapping.getSourceSchema()))
            .append(".").append(quoteIdentifier(tableMapping.getSourceTable()));
        sql.append(buildWhereClause(tableMapping.getFilterCondition(), null));
        
        try (Connection sourceConn = connectionManager.getConnection(project.getSourceConnection());
             Statement stmt = sourceConn.createStatement();
             ResultSet rs = stmt.executeQuery(sql.toString())) {
            
            if (rs.next()) {
                Long min = getLongValue(rs, 1);
                Long max = getLongValue(rs, 2);
                return new Long[]{min, max};
            }
        }
        return new Long[]{null, null};
    }
    
    private Long getLongValue(ResultSet rs, int index) throws SQLException {
        Object value = rs.getObject(index);
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        try {
            return Long.parseLong(value.toString());
        } catch (NumberFormatException ex) {
            return null;
        }
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
    
    private void executeMigration(Project project, AppSettings settings, MigrationProgress progress) {
        String projectId = project.getId();
        AtomicBoolean pauseFlag = pauseFlags.computeIfAbsent(projectId, id -> new AtomicBoolean(false));
        ExecutorService tableExecutor = null;
        List<Future<?>> futures = new ArrayList<>();
        Throwable failure = null;
        
        try {
            boolean isResume = progress.getCompletedTables() > 0 ||
                project.getTableMappings().stream().anyMatch(t -> "migrated".equals(t.getStatus()));
            
            if (!isResume) {
                addLog(progress, "info", "Migration started", null);
                createTargetTables(project, progress);
            } else {
                addLog(progress, "info", "Migration resumed (parallel tables enabled)", null);
            }
            
            List<TableMapping> tablesToMigrate = project.getTableMappings()
                .stream()
                .filter(TableMapping::getEnabled)
                .filter(table -> !"migrated".equals(table.getStatus()))
                .collect(Collectors.toList());
            
            if (tablesToMigrate.isEmpty()) {
                progress.setStatus("completed");
                progress.setCurrentTable(null);
                saveProgressToDatabase(progress.getProjectId(), progress);
                addLog(progress, "success", "Migration completed successfully", null);
                return;
            }
            
            int parallelTables = resolveParallelTables(settings);
            addLog(progress, "info", String.format("Running %d parallel table worker(s)", parallelTables), null);
            tableExecutor = Executors.newFixedThreadPool(parallelTables);
            
            for (TableMapping tableMapping : tablesToMigrate) {
                futures.add(tableExecutor.submit(() -> {
                    try {
                        processTableMigration(project, tableMapping, settings, progress, pauseFlag, isResume);
                    } catch (Exception e) {
                        throw new RuntimeException(e);
                    }
                }));
            }
            
            for (Future<?> future : futures) {
                future.get();
            }
            
            progress.setStatus("completed");
            progress.setCurrentTable(null);
            saveProgressToDatabase(progress.getProjectId(), progress);
            addLog(progress, "success", "Migration completed successfully", null);
        } catch (ExecutionException e) {
            failure = e.getCause() != null ? e.getCause() : e;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            failure = e;
        } catch (Exception e) {
            failure = e;
        } finally {
            if (failure != null) {
                futures.forEach(future -> future.cancel(true));
                if (tableExecutor != null) {
                    tableExecutor.shutdownNow();
                }
                progress.setStatus("error");
                progress.setCurrentTable(null);
                saveProgressToDatabase(progress.getProjectId(), progress);
                addLog(progress, "error", "Migration failed: " + failure.getMessage(), failure.toString());
            } else if (tableExecutor != null) {
                tableExecutor.shutdown();
                try {
                    tableExecutor.awaitTermination(30, TimeUnit.SECONDS);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                }
            }
            executionThreads.remove(projectId);
        }
    }
    
    private void processTableMigration(Project project,
                                       TableMapping tableMapping,
                                       AppSettings settings,
                                       MigrationProgress progress,
                                       AtomicBoolean pauseFlag,
                                       boolean isResume) throws Exception {
        waitForResume(progress, pauseFlag);
        setCurrentTable(progress, tableMapping.getSourceTable());
        addLog(progress, "info", "Migrating table: " + tableMapping.getSourceTable(), null);
        
        try {
            if (!isResume) {
                prepareTableForMigration(project, tableMapping, progress);
            }
            long migratedRows;
            boolean attemptChunking = shouldUseChunking(tableMapping);
            ColumnMapping partitionMapping = attemptChunking ? findPartitionColumnMapping(tableMapping) : null;
            boolean validChunkColumn = attemptChunking &&
                partitionMapping != null &&
                isChunkableColumnType(partitionMapping.getSourceDataType() != null
                    ? partitionMapping.getSourceDataType()
                    : partitionMapping.getTargetDataType());
            
            if (attemptChunking && !validChunkColumn) {
                addLog(progress, "warning",
                    "Chunking disabled for " + tableMapping.getSourceTable() + " (partition column is missing or not numeric)",
                    null);
            }
            
            if (attemptChunking && validChunkColumn) {
                migratedRows = migrateTableWithChunks(project, tableMapping, settings, progress, pauseFlag);
            } else {
                migratedRows = migrateTable(project, tableMapping, settings, progress, pauseFlag);
            }
            
            tableMapping.setStatus("migrated");
            updateTableMappingStatus(project.getId(), tableMapping.getId(), "migrated");
            
            incrementCompletedTables(progress);
            saveProgressToDatabase(progress.getProjectId(), progress);
            
            addLog(progress, "success",
                String.format("Completed table: %s (%d rows migrated)",
                    tableMapping.getSourceTable(), migratedRows),
                null);
        } catch (Exception e) {
            tableMapping.setStatus("error");
            updateTableMappingStatus(project.getId(), tableMapping.getId(), "error");
            addLog(progress, "error",
                "Failed to migrate table: " + tableMapping.getSourceTable() + " - " + e.getMessage(),
                e.toString());
            throw e;
        }
    }
    
    private long migrateTableWithChunks(Project project,
                                        TableMapping tableMapping,
                                        AppSettings settings,
                                        MigrationProgress progress,
                                        AtomicBoolean pauseFlag) throws Exception {
        List<ChunkRange> chunkRanges = buildChunkRanges(project, tableMapping);
        if (chunkRanges.isEmpty()) {
            addLog(progress, "warning",
                "Unable to determine partition bounds for " + tableMapping.getSourceTable() + ". Falling back to single-thread copy.",
                null);
            return migrateTable(project, tableMapping, settings, progress, pauseFlag);
        }
        
        int requestedWorkers = tableMapping.getChunkWorkers() != null ? tableMapping.getChunkWorkers() : 1;
        int workerCount = Math.max(1, Math.min(requestedWorkers, chunkRanges.size()));
        addLog(progress, "info",
            String.format("Chunking %s using %d worker(s) across %d range(s)",
                tableMapping.getSourceTable(), workerCount, chunkRanges.size()),
            null);
        
        ExecutorService chunkExecutor = Executors.newFixedThreadPool(workerCount);
        List<Future<Long>> chunkFutures = new ArrayList<>();
        for (ChunkRange chunkRange : chunkRanges) {
            chunkFutures.add(chunkExecutor.submit(() -> {
                waitForResume(progress, pauseFlag);
                return migrateTableRange(project, tableMapping, settings, progress, pauseFlag, chunkRange);
            }));
        }
        
        long migratedRows = 0L;
        try {
            for (Future<Long> future : chunkFutures) {
                migratedRows += future.get();
            }
        } catch (ExecutionException e) {
            chunkFutures.forEach(f -> f.cancel(true));
            throw (e.getCause() instanceof Exception) ? (Exception) e.getCause() : new RuntimeException(e.getCause());
        } finally {
            chunkExecutor.shutdown();
            try {
                chunkExecutor.awaitTermination(30, TimeUnit.SECONDS);
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
            }
        }
        return migratedRows;
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
    
    private long migrateTable(Project project, TableMapping tableMapping, 
                             AppSettings settings, MigrationProgress progress, AtomicBoolean pauseFlag) throws SQLException {
        return migrateTableRange(project, tableMapping, settings, progress, pauseFlag, null);
    }
    
    private long migrateTableRange(Project project, TableMapping tableMapping, 
                             AppSettings settings, MigrationProgress progress, AtomicBoolean pauseFlag, ChunkRange chunkRange) throws SQLException {
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
                quoteIdentifier(tableMapping.getSourceSchema()),
                quoteIdentifier(tableMapping.getSourceTable()));
            
            String extraCondition = null;
            if (chunkRange != null && tableMapping.getPartitionColumn() != null) {
                String columnIdentifier = quoteIdentifier(tableMapping.getPartitionColumn());
                extraCondition = String.format("%s >= %d AND %s <= %d",
                    columnIdentifier, chunkRange.startInclusive, columnIdentifier, chunkRange.endInclusive);
            }
            selectSql += buildWhereClause(tableMapping.getFilterCondition(), extraCondition);
            
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
                quoteIdentifier(tableMapping.getTargetSchema()),
                quoteIdentifier(tableMapping.getTargetTable()),
                insertCols.toString(),
                insertVals.toString());
            
            int batchSize = settings.getBatchSize() != null ? settings.getBatchSize() : 1000;
            int commitInterval = settings.getCommitInterval() != null ? settings.getCommitInterval() : 10000;
            
            long totalRows = 0L;
            long rowsSinceLastPersist = 0L;
            
            try (PreparedStatement selectStmt = sourceConn.prepareStatement(selectSql);
                 PreparedStatement insertStmt = targetConn.prepareStatement(insertSql);
                 ResultSet rs = selectStmt.executeQuery()) {
                
                int rowCount = 0;
                
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
                        if ("paused".equals(progress.getStatus())) {
                            try {
                                waitForResume(progress, pauseFlag);
                                continue;
                            } catch (InterruptedException e) {
                                Thread.currentThread().interrupt();
                                throw new SQLException("Migration interrupted", e);
                            }
                        }
                        if ("error".equals(progress.getStatus())) {
                            throw new SQLException("Migration aborted due to global error state");
                        }
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
                    rowsSinceLastPersist++;
                    
                    if (rowCount >= batchSize) {
                        insertStmt.executeBatch();
                        if (!useAutoCommit) {
                            targetConn.commit();
                        }
                        rowCount = 0;
                        incrementMigratedRows(progress, rowsSinceLastPersist);
                        rowsSinceLastPersist = 0L;
                    }
                    
                    if (totalRows % commitInterval == 0) {
                        addLog(progress, "info",
                            String.format("Migrated %d rows from %s", totalRows, tableMapping.getSourceTable()),
                            null);
                        log.info("Migrated {} rows from {}", totalRows, tableMapping.getSourceTable());
                    }
                }
                
                // Execute remaining batch
                if (rowCount > 0) {
                    insertStmt.executeBatch();
                    if (!useAutoCommit) {
                        targetConn.commit();
                    }
                }
                
                if (rowsSinceLastPersist > 0) {
                    incrementMigratedRows(progress, rowsSinceLastPersist);
                    rowsSinceLastPersist = 0L;
                }
            } finally {
                // Restore original auto-commit setting (before connections close)
                targetConn.setAutoCommit(originalAutoCommit);
            }
            
            return totalRows;
        }
    }
    
    private void addLog(MigrationProgress progress, String level, String message, String details) {
        MigrationLog log = new MigrationLog();
        log.setId(UUID.randomUUID().toString());
        log.setTimestamp(LocalDateTime.now());
        log.setLevel(level);
        log.setMessage(message);
        log.setDetails(details);
        synchronized (progress) {
            progress.getLogs().add(log);
        }
        
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

