package com.ora2pg.migration.service;

import com.ora2pg.migration.model.*;
import com.ora2pg.migration.util.DatabaseConnectionManager;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.codec.digest.DigestUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.sql.*;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
public class DataValidationService {
    
    @Autowired
    private DatabaseConnectionManager connectionManager;
    
    @Autowired
    private ProjectService projectService;
    
    /**
     * Compare row counts between source and target tables
     */
    public List<RowCountResult> compareRowCounts(String projectId, List<String> tableNames) {
        List<RowCountResult> results = new ArrayList<>();
        
        try {
            Project project = projectService.getProjectById(projectId);
            if (project.getSourceConnection() == null || project.getTargetConnection() == null) {
                throw new RuntimeException("Source or target connection not configured");
            }
            
            // Get table mappings
            List<TableMapping> tableMappings = project.getTableMappings();
            if (tableMappings == null || tableMappings.isEmpty()) {
                throw new RuntimeException("No table mappings configured");
            }
            
            // Filter by table names if provided
            if (tableNames != null && !tableNames.isEmpty()) {
                tableMappings = tableMappings.stream()
                    .filter(tm -> tableNames.contains(tm.getSourceTable()))
                    .collect(Collectors.toList());
            }
            
            // Compare row counts for each table
            for (TableMapping mapping : tableMappings) {
                RowCountResult result = new RowCountResult();
                result.setTable(mapping.getSourceTable());
                result.setSourceSchema(mapping.getSourceSchema());
                result.setTargetSchema(mapping.getTargetSchema());
                
                try {
                    // Get source count
                    Long sourceCount = getRowCount(
                        project.getSourceConnection(),
                        mapping.getSourceSchema(),
                        mapping.getSourceTable()
                    );
                    result.setSourceCount(sourceCount);
                    
                    // Get target count
                    Long targetCount = getRowCount(
                        project.getTargetConnection(),
                        mapping.getTargetSchema(),
                        mapping.getTargetTable()
                    );
                    result.setTargetCount(targetCount);
                    
                    // Calculate difference
                    Long difference = sourceCount - targetCount;
                    result.setDifference(difference);
                    result.setMatch(difference == 0);
                    result.setStatus(result.getMatch() ? "match" : "mismatch");
                    
                } catch (Exception e) {
                    log.error("Error comparing row counts for table {}: {}", mapping.getSourceTable(), e.getMessage());
                    result.setStatus("error");
                    result.setErrorMessage(e.getMessage());
                    result.setMatch(false);
                }
                
                results.add(result);
            }
            
        } catch (Exception e) {
            log.error("Error in compareRowCounts: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to compare row counts: " + e.getMessage(), e);
        }
        
        return results;
    }
    
    /**
     * Calculate and compare checksums between source and target tables
     */
    public List<ChecksumResult> compareChecksums(String projectId, List<String> tableNames, 
                                                  String algorithm, List<String> columnsToInclude) {
        List<ChecksumResult> results = new ArrayList<>();
        
        try {
            Project project = projectService.getProjectById(projectId);
            if (project.getSourceConnection() == null || project.getTargetConnection() == null) {
                throw new RuntimeException("Source or target connection not configured");
            }
            
            // Default to MD5 if not specified
            if (algorithm == null || algorithm.isEmpty()) {
                algorithm = "MD5";
            }
            
            // Get table mappings
            List<TableMapping> tableMappings = project.getTableMappings();
            if (tableMappings == null || tableMappings.isEmpty()) {
                throw new RuntimeException("No table mappings configured");
            }
            
            // Filter by table names if provided
            if (tableNames != null && !tableNames.isEmpty()) {
                tableMappings = tableMappings.stream()
                    .filter(tm -> tableNames.contains(tm.getSourceTable()))
                    .collect(Collectors.toList());
            }
            
            // Compare checksums for each table
            for (TableMapping mapping : tableMappings) {
                ChecksumResult result = new ChecksumResult();
                result.setTable(mapping.getSourceTable());
                result.setSourceSchema(mapping.getSourceSchema());
                result.setTargetSchema(mapping.getTargetSchema());
                result.setAlgorithm(algorithm);
                
                try {
                    // Get source checksum
                    String sourceChecksum = calculateTableChecksum(
                        project.getSourceConnection(),
                        mapping.getSourceSchema(),
                        mapping.getSourceTable(),
                        algorithm,
                        columnsToInclude
                    );
                    result.setSourceChecksum(sourceChecksum);
                    
                    // Get target checksum
                    String targetChecksum = calculateTableChecksum(
                        project.getTargetConnection(),
                        mapping.getTargetSchema(),
                        mapping.getTargetTable(),
                        algorithm,
                        columnsToInclude
                    );
                    result.setTargetChecksum(targetChecksum);
                    
                    // Get row count for reference
                    Long rowCount = getRowCount(
                        project.getSourceConnection(),
                        mapping.getSourceSchema(),
                        mapping.getSourceTable()
                    );
                    result.setRowCount(rowCount);
                    
                    // Compare checksums
                    boolean match = sourceChecksum != null && sourceChecksum.equals(targetChecksum);
                    result.setMatch(match);
                    result.setStatus(match ? "valid" : "invalid");
                    
                } catch (Exception e) {
                    log.error("Error comparing checksums for table {}: {}", mapping.getSourceTable(), e.getMessage());
                    result.setStatus("error");
                    result.setErrorMessage(e.getMessage());
                    result.setMatch(false);
                }
                
                results.add(result);
            }
            
        } catch (Exception e) {
            log.error("Error in compareChecksums: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to compare checksums: " + e.getMessage(), e);
        }
        
        return results;
    }
    
    /**
     * Perform dry-run simulation for migration
     */
    public List<DryRunResult> performDryRun(String projectId, List<String> tableNames) {
        List<DryRunResult> results = new ArrayList<>();
        
        try {
            Project project = projectService.getProjectById(projectId);
            if (project.getSourceConnection() == null || project.getTargetConnection() == null) {
                throw new RuntimeException("Source or target connection not configured");
            }
            
            // Get table mappings
            List<TableMapping> tableMappings = project.getTableMappings();
            if (tableMappings == null || tableMappings.isEmpty()) {
                throw new RuntimeException("No table mappings configured");
            }
            
            // Filter by table names if provided
            if (tableNames != null && !tableNames.isEmpty()) {
                tableMappings = tableMappings.stream()
                    .filter(tm -> tableNames.contains(tm.getSourceTable()))
                    .collect(Collectors.toList());
            }
            
            // Simulate migration for each table
            for (TableMapping mapping : tableMappings) {
                DryRunResult result = new DryRunResult(
                    mapping.getSourceTable(),
                    mapping.getSourceSchema(),
                    mapping.getTargetSchema()
                );
                
                try {
                    // Get row count
                    Long rowCount = getRowCount(
                        project.getSourceConnection(),
                        mapping.getSourceSchema(),
                        mapping.getSourceTable()
                    );
                    result.setRowCount(rowCount);
                    
                    // Estimate size (rough estimate: assume average row size)
                    long estimatedSizeBytes = estimateTableSize(
                        project.getSourceConnection(),
                        mapping.getSourceSchema(),
                        mapping.getSourceTable(),
                        rowCount
                    );
                    result.setEstimatedSize(formatSize(estimatedSizeBytes));
                    
                    // Estimate time (rough estimate based on row count and size)
                    long estimatedTimeSeconds = estimateMigrationTime(rowCount, estimatedSizeBytes);
                    result.setEstimatedTime(formatTime(estimatedTimeSeconds));
                    
                    // Generate DDL preview
                    String ddl = generateDdlPreview(mapping);
                    result.setDdlPreview(ddl);
                    
                    // Check for potential issues
                    List<String> issues = checkForIssues(mapping, rowCount, estimatedSizeBytes);
                    result.setIssues(issues);
                    
                    if (!issues.isEmpty()) {
                        result.setStatus("warning");
                    } else {
                        result.setStatus("ready");
                    }
                    
                } catch (Exception e) {
                    log.error("Error in dry-run for table {}: {}", mapping.getSourceTable(), e.getMessage());
                    result.setStatus("error");
                    result.setErrorMessage(e.getMessage());
                }
                
                results.add(result);
            }
            
        } catch (Exception e) {
            log.error("Error in performDryRun: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to perform dry-run: " + e.getMessage(), e);
        }
        
        return results;
    }
    
    // Helper methods
    
    private Long getRowCount(ConnectionConfig config, String schema, String tableName) throws SQLException {
        try (Connection conn = connectionManager.getConnection(config)) {
            // Quote identifiers appropriately
            String quotedSchema = quoteIdentifier(config.getType(), schema);
            String quotedTable = quoteIdentifier(config.getType(), tableName);
            String sql = String.format("SELECT COUNT(*) FROM %s.%s", quotedSchema, quotedTable);
            
            try (Statement stmt = conn.createStatement();
                 ResultSet rs = stmt.executeQuery(sql)) {
                if (rs.next()) {
                    return rs.getLong(1);
                }
            }
        }
        return 0L;
    }
    
    private String calculateTableChecksum(ConnectionConfig config, String schema, String tableName,
                                           String algorithm, List<String> columnsToInclude) throws SQLException {
        try (Connection conn = connectionManager.getConnection(config)) {
            // Get columns with their data types
            Map<String, String> columnTypes = getTableColumnsWithTypes(conn, config.getType(), schema, tableName);
            
            // Build column list
            List<String> columnNames;
            if (columnsToInclude == null || columnsToInclude.isEmpty()) {
                columnNames = new ArrayList<>(columnTypes.keySet());
            } else {
                columnNames = columnsToInclude;
            }
            
            // Track which columns need special handling (LONG RAW, BLOB)
            Map<Integer, String> binaryColumnIndices = new LinkedHashMap<>(); // column index -> column name
            List<String> columnExpressions = new ArrayList<>();
            int columnIndex = 0;
            
            for (String colName : columnNames) {
                columnIndex++;
                String dataType = columnTypes.getOrDefault(colName, "").toUpperCase();
                String quotedCol = quoteIdentifier(config.getType(), colName);
                
                // Check if it's a binary type
                if (isBinaryType(dataType)) {
                    if ("oracle".equalsIgnoreCase(config.getType())) {
                        // Oracle: LONG RAW cannot be used in SQL functions - must fetch as bytes
                        if (dataType.equals("LONG RAW") || dataType.contains("LONG RAW")) {
                            // Select LONG RAW directly, will fetch as bytes in Java
                            columnExpressions.add(quotedCol);
                            binaryColumnIndices.put(columnIndex, colName);
                        } else if (dataType.contains("RAW") && !dataType.contains("LONG")) {
                            // Regular RAW can use RAWTOHEX
                            columnExpressions.add("RAWTOHEX(" + quotedCol + ")");
                        } else if (dataType.contains("BLOB")) {
                            // BLOB: fetch as bytes in Java
                            columnExpressions.add(quotedCol);
                            binaryColumnIndices.put(columnIndex, colName);
                        } else {
                            // Fallback: try RAWTOHEX
                            columnExpressions.add("RAWTOHEX(" + quotedCol + ")");
                        }
                    } else {
                        // PostgreSQL: Use encode(column, 'hex') for BYTEA
                        columnExpressions.add("encode(" + quotedCol + ", 'hex')");
                    }
                } else {
                    // Non-binary: use as-is or convert to text
                    if ("oracle".equalsIgnoreCase(config.getType())) {
                        // Oracle: LONG and LONG RAW have restrictions - handle LONG separately
                        if (dataType.equals("LONG")) {
                            // LONG cannot be used in TO_CHAR in SELECT - must fetch directly
                            columnExpressions.add(quotedCol);
                            // Note: LONG text will be handled as string in Java
                        } else if (dataType.contains("DATE") || dataType.contains("TIMESTAMP")) {
                            columnExpressions.add("NVL(TO_CHAR(" + quotedCol + ", 'YYYY-MM-DD HH24:MI:SS'), 'NULL')");
                        } else if (dataType.contains("CLOB")) {
                            columnExpressions.add("NVL(TO_CHAR(" + quotedCol + "), 'NULL')");
                        } else if (dataType.contains("NUMBER") || dataType.contains("NUMERIC") || 
                                  dataType.contains("INTEGER") || dataType.contains("FLOAT")) {
                            columnExpressions.add("NVL(TO_CHAR(" + quotedCol + "), 'NULL')");
                        } else {
                            // For VARCHAR2, CHAR, etc., use NVL directly
                            columnExpressions.add("NVL(" + quotedCol + ", 'NULL')");
                        }
                    } else {
                        // PostgreSQL: Use ::text for consistent string representation
                        columnExpressions.add("COALESCE(" + quotedCol + "::text, 'NULL')");
                    }
                }
            }
            
            String columnList = String.join(", ", columnExpressions);
            
            // Quote schema and table names
            String quotedSchema = quoteIdentifier(config.getType(), schema);
            String quotedTable = quoteIdentifier(config.getType(), tableName);
            
            // Build query to concatenate all column values
            String sql;
            if ("oracle".equalsIgnoreCase(config.getType())) {
                sql = String.format("SELECT %s FROM %s.%s ORDER BY ROWID", columnList, quotedSchema, quotedTable);
            } else {
                sql = String.format("SELECT %s FROM %s.%s ORDER BY ctid", columnList, quotedSchema, quotedTable);
            }
            
            // Fetch all rows and calculate checksum
            StringBuilder allData = new StringBuilder();
            try (Statement stmt = conn.createStatement();
                 ResultSet rs = stmt.executeQuery(sql)) {
                
                ResultSetMetaData metaData = rs.getMetaData();
                int columnCount = metaData.getColumnCount();
                
                while (rs.next()) {
                    for (int i = 1; i <= columnCount; i++) {
                        String columnName = columnNames.get(i - 1);
                        
                        // Check if this column needs binary handling (LONG RAW, BLOB)
                        if (binaryColumnIndices.containsKey(i)) {
                            // Handle binary columns that were selected directly (LONG RAW, BLOB)
                            try {
                                byte[] bytes = rs.getBytes(i);
                                if (bytes != null) {
                                    // Convert bytes to hex string
                                    allData.append(bytesToHex(bytes));
                                } else {
                                    allData.append("NULL");
                                }
                            } catch (SQLException e) {
                                // For very large LONG RAW, try getBinaryStream
                                try {
                                    java.io.InputStream is = rs.getBinaryStream(i);
                                    if (is != null) {
                                        byte[] buffer = new byte[8192];
                                        java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
                                        int bytesRead;
                                        while ((bytesRead = is.read(buffer)) != -1) {
                                            baos.write(buffer, 0, bytesRead);
                                        }
                                        byte[] bytes = baos.toByteArray();
                                        allData.append(bytesToHex(bytes));
                                        is.close();
                                    } else {
                                        allData.append("NULL");
                                    }
                                } catch (Exception streamE) {
                                    // Final fallback: try as object
                                    try {
                                        Object value = rs.getObject(i);
                                        if (value instanceof byte[]) {
                                            allData.append(bytesToHex((byte[]) value));
                                        } else if (value != null) {
                                            allData.append(value.toString());
                                        } else {
                                            allData.append("NULL");
                                        }
                                    } catch (Exception objE) {
                                        log.warn("Failed to read binary column {}: {}", columnName, objE.getMessage());
                                        allData.append("NULL");
                                    }
                                }
                            }
                        } else {
                            // For other types (including hex-encoded binary from SQL), get as string
                            String value = rs.getString(i);
                            allData.append(value != null ? value : "NULL");
                        }
                        
                        if (i < columnCount) {
                            allData.append("|");
                        }
                    }
                    allData.append("\n");
                }
            }
            
            // Calculate hash
            String hash;
            switch (algorithm.toUpperCase()) {
                case "SHA256":
                    hash = DigestUtils.sha256Hex(allData.toString());
                    break;
                case "SHA512":
                    hash = DigestUtils.sha512Hex(allData.toString());
                    break;
                case "MD5":
                default:
                    hash = DigestUtils.md5Hex(allData.toString());
                    break;
            }
            
            return hash;
        }
    }
    
    /**
     * Check if a data type is binary
     */
    private boolean isBinaryType(String dataType) {
        if (dataType == null) return false;
        String upper = dataType.toUpperCase();
        return upper.contains("RAW") || 
               upper.contains("BLOB") || 
               upper.equals("BYTEA") ||
               upper.contains("BINARY");
    }
    
    /**
     * Convert byte array to hex string
     */
    private String bytesToHex(byte[] bytes) {
        if (bytes == null) return "NULL";
        StringBuilder hex = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            hex.append(String.format("%02x", b));
        }
        return hex.toString();
    }
    
    /**
     * Get table columns with their data types
     */
    private Map<String, String> getTableColumnsWithTypes(Connection conn, String dbType, String schema, String tableName) throws SQLException {
        Map<String, String> columns = new LinkedHashMap<>();
        
        if ("oracle".equalsIgnoreCase(dbType)) {
            String sql = """
                SELECT column_name, data_type 
                FROM all_tab_columns 
                WHERE owner = UPPER(?) AND table_name = UPPER(?)
                ORDER BY column_id
                """;
            try (PreparedStatement stmt = conn.prepareStatement(sql)) {
                stmt.setString(1, schema);
                stmt.setString(2, tableName);
                try (ResultSet rs = stmt.executeQuery()) {
                    while (rs.next()) {
                        columns.put(rs.getString("column_name"), rs.getString("data_type"));
                    }
                }
            }
        } else {
            // PostgreSQL: Use JDBC DatabaseMetaData
            DatabaseMetaData metaData = conn.getMetaData();
            try (ResultSet rs = metaData.getColumns(null, schema, tableName, null)) {
                while (rs.next()) {
                    String columnName = rs.getString("COLUMN_NAME");
                    String dataType = rs.getString("TYPE_NAME");
                    columns.put(columnName, dataType);
                }
            }
        }
        
        return columns;
    }
    
    /**
     * Quotes an identifier based on database type.
     * PostgreSQL requires quotes for case-sensitive identifiers.
     * Oracle is case-insensitive for unquoted identifiers.
     */
    private String quoteIdentifier(String dbType, String identifier) {
        if (identifier == null || identifier.isEmpty()) {
            return "\"\"";
        }
        
        // Remove existing quotes if present
        identifier = identifier.replace("\"", "");
        
        if ("postgresql".equalsIgnoreCase(dbType)) {
            // PostgreSQL: Always quote to preserve case
            return "\"" + identifier + "\"";
        } else {
            // Oracle: Uppercase unquoted identifiers are case-insensitive
            // For Oracle, we can return as-is or uppercase
            return identifier.toUpperCase();
        }
    }
    
    private long estimateTableSize(ConnectionConfig config, String schema, String tableName, Long rowCount) throws SQLException {
        // Rough estimate: assume average row size of 1KB
        // In production, you might want to query actual table size
        return rowCount * 1024;
    }
    
    private long estimateMigrationTime(Long rowCount, long sizeBytes) {
        // Rough estimate: assume 1000 rows/second and network speed of 10MB/s
        long rowsPerSecond = 1000;
        long bytesPerSecond = 10 * 1024 * 1024; // 10 MB/s
        
        long timeFromRows = rowCount / rowsPerSecond;
        long timeFromSize = sizeBytes / bytesPerSecond;
        
        // Return the maximum (bottleneck)
        return Math.max(timeFromRows, timeFromSize);
    }
    
    private String formatSize(long bytes) {
        if (bytes < 1024) {
            return bytes + " B";
        } else if (bytes < 1024 * 1024) {
            return String.format("%.2f KB", bytes / 1024.0);
        } else if (bytes < 1024 * 1024 * 1024) {
            return String.format("%.2f MB", bytes / (1024.0 * 1024.0));
        } else {
            return String.format("%.2f GB", bytes / (1024.0 * 1024.0 * 1024.0));
        }
    }
    
    private String formatTime(long seconds) {
        if (seconds < 60) {
            return seconds + "s";
        } else if (seconds < 3600) {
            long minutes = seconds / 60;
            long secs = seconds % 60;
            return minutes + "m " + secs + "s";
        } else {
            long hours = seconds / 3600;
            long minutes = (seconds % 3600) / 60;
            return hours + "h " + minutes + "m";
        }
    }
    
    private String generateDdlPreview(TableMapping mapping) {
        // Simple DDL preview - in production, you'd generate actual CREATE TABLE statement
        StringBuilder ddl = new StringBuilder();
        ddl.append("CREATE TABLE ").append(mapping.getTargetSchema())
           .append(".").append(mapping.getTargetTable()).append(" (\n");
        
        if (mapping.getColumnMappings() != null && !mapping.getColumnMappings().isEmpty()) {
            for (int i = 0; i < mapping.getColumnMappings().size(); i++) {
                ColumnMapping col = mapping.getColumnMappings().get(i);
                ddl.append("  ").append(col.getTargetColumn())
                   .append(" ").append(col.getTargetDataType() != null ? col.getTargetDataType() : "TEXT");
                if (!col.getNullable()) {
                    ddl.append(" NOT NULL");
                }
                if (i < mapping.getColumnMappings().size() - 1) {
                    ddl.append(",");
                }
                ddl.append("\n");
            }
        } else {
            ddl.append("  -- Column mappings not configured\n");
        }
        
        ddl.append(");");
        return ddl.toString();
    }
    
    private List<String> checkForIssues(TableMapping mapping, Long rowCount, long estimatedSize) {
        List<String> issues = new ArrayList<>();
        
        // Large table warning
        if (rowCount > 1_000_000) {
            issues.add("Large table - consider batch migration");
        }
        
        // Very large table warning
        if (rowCount > 10_000_000) {
            issues.add("Very large table - migration may take several hours");
        }
        
        // Large size warning
        if (estimatedSize > 1024 * 1024 * 1024) { // > 1GB
            issues.add("Large data size - ensure sufficient network bandwidth");
        }
        
        // Missing column mappings
        if (mapping.getColumnMappings() == null || mapping.getColumnMappings().isEmpty()) {
            issues.add("No column mappings configured");
        }
        
        return issues;
    }
}

