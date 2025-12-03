package com.ora2pg.migration.service;

import com.ora2pg.migration.model.*;
import com.ora2pg.migration.util.DatabaseConnectionManager;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
public class DatabaseService {
    
    @Autowired
    private DatabaseConnectionManager connectionManager;
    
    public ConnectionTestResult testConnection(ConnectionConfig config) {
        long startTime = System.currentTimeMillis();
        try {
            boolean isValid = connectionManager.testConnection(config);
            long connectionTime = System.currentTimeMillis() - startTime;
            
            if (isValid) {
                String version = connectionManager.getDatabaseVersion(config);
                return new ConnectionTestResult(true, "Connection successful", version, connectionTime);
            } else {
                return new ConnectionTestResult(false, "Connection failed", null, connectionTime);
            }
        } catch (Exception e) {
            long connectionTime = System.currentTimeMillis() - startTime;
            return new ConnectionTestResult(false, "Connection error: " + e.getMessage(), null, connectionTime);
        }
    }
    
    public List<TableInfo> discoverTables(ConnectionConfig config, String schema, String tableNameFilter) throws SQLException {
        List<TableInfo> tables = new ArrayList<>();
        
        try (Connection conn = connectionManager.getConnection(config)) {
            if ("oracle".equalsIgnoreCase(config.getType())) {
                tables = discoverOracleTables(conn, schema, tableNameFilter);
            } else if ("postgresql".equalsIgnoreCase(config.getType())) {
                tables = discoverPostgresTables(conn, schema, tableNameFilter);
            }
        }
        
        return tables;
    }
    
    private List<TableInfo> discoverOracleTables(Connection conn, String schema, String tableNameFilter) throws SQLException {
        List<TableInfo> tables = new ArrayList<>();
        
        // Build SQL with optional table name filter
        String sql;
        if (tableNameFilter != null && !tableNameFilter.trim().isEmpty()) {
            sql = """
                SELECT table_name 
                FROM all_tables 
                WHERE owner = UPPER(?) AND table_name LIKE UPPER(?)
                ORDER BY table_name
                """;
        } else {
            sql = """
                SELECT table_name 
                FROM all_tables 
                WHERE owner = UPPER(?)
                ORDER BY table_name
                """;
        }
        
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, schema);
            if (tableNameFilter != null && !tableNameFilter.trim().isEmpty()) {
                stmt.setString(2, tableNameFilter.toUpperCase());
            }
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    String tableName = rs.getString("table_name");
                    TableInfo table = new TableInfo(tableName, schema);
                    Long rowCount = getRowCount(conn, schema, tableName);
                    table.setRowCount(rowCount);
                    List<ColumnInfo> columns = discoverOracleColumns(conn, schema, tableName);
                    table.setColumns(columns);
                    tables.add(table);
                    log.info("Scanned table {} with total rows {} and total columns {}", tableName, rowCount, columns.size());
                }
            }
        }
        
        return tables;
    }
    
    private List<TableInfo> discoverPostgresTables(Connection conn, String schema, String tableNameFilter) throws SQLException {
        List<TableInfo> tables = new ArrayList<>();
        
        // Build SQL with optional table name filter
        String sql;
        if (tableNameFilter != null && !tableNameFilter.trim().isEmpty()) {
            sql = """
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = ?
                AND table_type = 'BASE TABLE'
                AND table_name LIKE ?
                ORDER BY table_name
                """;
        } else {
            sql = """
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = ?
                AND table_type = 'BASE TABLE'
                ORDER BY table_name
                """;
        }
        
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, schema);
            if (tableNameFilter != null && !tableNameFilter.trim().isEmpty()) {
                stmt.setString(2, tableNameFilter);
            }
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    String tableName = rs.getString("table_name");
                    TableInfo table = new TableInfo(tableName, schema);
                    table.setRowCount(getRowCount(conn, schema, tableName));
                    table.setColumns(discoverPostgresColumns(conn, schema, tableName));
                    tables.add(table);
                }
            }
        }
        
        return tables;
    }
    
    private List<ColumnInfo> discoverOracleColumns(Connection conn, String schema, String tableName) throws SQLException {
        List<ColumnInfo> columns = new ArrayList<>();
        String sql = """
            SELECT 
                column_name,
                data_type,
                data_length,
                data_precision,
                data_scale,
                nullable,
                data_default
            FROM all_tab_columns
            WHERE owner = UPPER(?) AND table_name = UPPER(?)
            ORDER BY column_id
            """;
        
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, schema);
            stmt.setString(2, tableName);
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    ColumnInfo col = new ColumnInfo();
                    col.setColumnName(rs.getString("column_name"));
                    col.setDataType(rs.getString("data_type"));
                    col.setDataLength(rs.getInt("data_length"));
                    col.setDataPrecision(rs.getInt("data_precision"));
                    col.setDataScale(rs.getInt("data_scale"));
                    col.setNullable("Y".equalsIgnoreCase(rs.getString("nullable")));
                    col.setDefaultValue(rs.getString("data_default"));
                    columns.add(col);
                }
            }
        }
        
        // Get primary keys
        setPrimaryKeys(conn, schema, tableName, columns);
        // Get foreign keys
        setForeignKeys(conn, schema, tableName, columns);
        
        return columns;
    }
    
    private List<ColumnInfo> discoverPostgresColumns(Connection conn, String schema, String tableName) throws SQLException {
        List<ColumnInfo> columns = new ArrayList<>();
        String sql = """
            SELECT 
                column_name,
                data_type,
                character_maximum_length as data_length,
                numeric_precision as data_precision,
                numeric_scale as data_scale,
                is_nullable,
                column_default
            FROM information_schema.columns
            WHERE table_schema = ? AND table_name = ?
            ORDER BY ordinal_position
            """;
        
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, schema);
            stmt.setString(2, tableName);
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    ColumnInfo col = new ColumnInfo();
                    col.setColumnName(rs.getString("column_name"));
                    col.setDataType(rs.getString("data_type"));
                    col.setDataLength(rs.getInt("data_length"));
                    col.setDataPrecision(rs.getInt("data_precision"));
                    col.setDataScale(rs.getInt("data_scale"));
                    col.setNullable("YES".equalsIgnoreCase(rs.getString("is_nullable")));
                    col.setDefaultValue(rs.getString("column_default"));
                    columns.add(col);
                }
            }
        }
        
        // Get primary keys
        setPrimaryKeys(conn, schema, tableName, columns);
        // Get foreign keys
        setForeignKeys(conn, schema, tableName, columns);
        
        return columns;
    }
    
    private void setPrimaryKeys(Connection conn, String schema, String tableName, List<ColumnInfo> columns) throws SQLException {
        String sql = """
            SELECT column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage ccu 
                ON tc.constraint_name = ccu.constraint_name
            WHERE tc.table_schema = ? 
                AND tc.table_name = ?
                AND tc.constraint_type = 'PRIMARY KEY'
            """;
        
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, schema);
            stmt.setString(2, tableName);
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    String colName = rs.getString("column_name");
                    columns.stream()
                        .filter(c -> c.getColumnName().equalsIgnoreCase(colName))
                        .forEach(c -> c.setIsPrimaryKey(true));
                }
            }
        } catch (SQLException e) {
            // Oracle uses different system tables, handle separately if needed
        }
    }
    
    private void setForeignKeys(Connection conn, String schema, String tableName, List<ColumnInfo> columns) throws SQLException {
        // Simplified - would need database-specific queries
        // For now, mark as false
        columns.forEach(c -> c.setIsForeignKey(false));
    }
    
    private Long getRowCount(Connection conn, String schema, String tableName) {
        try {
            String sql = String.format("SELECT COUNT(*) FROM %s.%s", schema, tableName);
            try (Statement stmt = conn.createStatement();
                 ResultSet rs = stmt.executeQuery(sql)) {
                if (rs.next()) {
                    return rs.getLong(1);
                }
            }
        } catch (SQLException e) {
            // Return null if count fails
        }
        return 0L;
    }
    
    public List<TableMapping> autoMapTables(List<TableInfo> sourceTables, String targetSchema) {
        List<TableMapping> mappings = new ArrayList<>();
        
        for (TableInfo sourceTable : sourceTables) {
            TableMapping mapping = new TableMapping(
                UUID.randomUUID().toString(),
                sourceTable.getTableName(),
                sourceTable.getSchema(),
                sourceTable.getTableName().toLowerCase(), // Default: lowercase target name
                targetSchema != null ? targetSchema : "public"
            );
            
            // Auto-map columns
            List<ColumnMapping> columnMappings = new ArrayList<>();
            for (ColumnInfo col : sourceTable.getColumns()) {
                ColumnMapping colMapping = new ColumnMapping();
                colMapping.setId(UUID.randomUUID().toString());
                colMapping.setSourceColumn(col.getColumnName());
                colMapping.setSourceDataType(col.getDataType());
                colMapping.setSourceDataLength(col.getDataLength());
                colMapping.setSourceDataPrecision(col.getDataPrecision());
                colMapping.setSourceDataScale(col.getDataScale());
                colMapping.setTargetColumn(col.getColumnName().toLowerCase());
                
                // Map data type and preserve length/precision/scale
                String mappedType = mapDataTypeWithLength(col.getDataType(), col.getDataLength(), col.getDataPrecision(), col.getDataScale());
                colMapping.setTargetDataType(mappedType);
                
                // Extract and set target length/precision/scale from mapped type
                extractTargetTypeInfo(mappedType, colMapping);
                
                colMapping.setNullable(col.getNullable());
                colMapping.setIsPrimaryKey(col.getIsPrimaryKey() != null && col.getIsPrimaryKey());
                colMapping.setIsForeignKey(col.getIsForeignKey() != null && col.getIsForeignKey());
                columnMappings.add(colMapping);
            }
            
            mapping.setColumnMappings(columnMappings);
            mappings.add(mapping);
        }
        
        return mappings;
    }
    
    private String mapDataType(String oracleType) {
        return mapDataTypeWithLength(oracleType, null, null, null);
    }
    
    private String mapDataTypeWithLength(String oracleType, Integer dataLength, Integer dataPrecision, Integer dataScale) {
        if (oracleType == null || oracleType.isEmpty()) return "TEXT";
        
        String upperType = oracleType.toUpperCase().trim();
        // Remove any existing parameters from the type name
        String baseType = upperType.contains("(") ? upperType.substring(0, upperType.indexOf("(")) : upperType;
        
        // Handle NUMBER with precision/scale
        if (baseType.equals("NUMBER")) {
            if (dataPrecision != null && dataPrecision > 0) {
                if (dataScale != null && dataScale > 0) {
                    return "NUMERIC(" + dataPrecision + "," + dataScale + ")";
                }
                return "NUMERIC(" + dataPrecision + ")";
            }
            return "NUMERIC";
        }
        
        // Handle VARCHAR2 with length
        if (baseType.equals("VARCHAR2") || baseType.equals("NVARCHAR2")) {
            if (dataLength != null && dataLength > 0) {
                return "VARCHAR(" + dataLength + ")";
            }
            // Check if length is in the type string itself
            if (upperType.contains("(")) {
                String params = upperType.substring(upperType.indexOf("("));
                return "VARCHAR" + params;
            }
            return "TEXT"; // Use TEXT if no length specified
        }
        
        // Handle CHAR with length
        if (baseType.equals("CHAR") || baseType.equals("NCHAR")) {
            if (dataLength != null && dataLength > 0) {
                return "CHAR(" + dataLength + ")";
            }
            if (upperType.contains("(")) {
                String params = upperType.substring(upperType.indexOf("("));
                return "CHAR" + params;
            }
            return "CHAR(1)"; // Default length
        }
        
        // Handle TIMESTAMP with precision
        if (baseType.startsWith("TIMESTAMP")) {
            if (upperType.contains("(")) {
                String params = upperType.substring(upperType.indexOf("("));
                return "TIMESTAMP" + params;
            }
            return "TIMESTAMP";
        }
        
        // Simple type mappings
        if (baseType.equals("CLOB") || baseType.equals("NCLOB") || baseType.equals("LONG")) return "TEXT";
        if (baseType.equals("DATE")) return "TIMESTAMP";
        // Handle binary types - note: LONG RAW is binary, not text
        if (baseType.equals("BLOB") || baseType.equals("RAW") || baseType.equals("LONG RAW") || 
            baseType.equals("LONGRAW") || upperType.contains("LONG RAW") || upperType.contains("LONGRAW")) {
            return "BYTEA";
        }
        if (baseType.equals("BFILE")) return "BYTEA";
        if (baseType.equals("BINARY_FLOAT")) return "REAL";
        if (baseType.equals("BINARY_DOUBLE") || baseType.equals("FLOAT")) return "DOUBLE PRECISION";
        if (baseType.equals("INTEGER") || baseType.equals("INT")) return "INTEGER";
        if (baseType.equals("SMALLINT")) return "SMALLINT";
        if (baseType.equals("BOOLEAN")) return "BOOLEAN";
        if (baseType.equals("ROWID")) return "VARCHAR(18)";
        if (baseType.equals("UROWID")) return "VARCHAR(4000)";
        if (baseType.equals("XMLTYPE")) return "XML";
        
        return "TEXT"; // Default fallback
    }
    
    private void extractTargetTypeInfo(String dataType, ColumnMapping colMapping) {
        if (dataType == null || dataType.isEmpty()) return;
        
        // Extract length from VARCHAR(n), CHAR(n)
        if (dataType.matches("VARCHAR\\((\\d+)\\)")) {
            String length = dataType.replaceAll("VARCHAR\\((\\d+)\\)", "$1");
            colMapping.setTargetDataLength(Integer.parseInt(length));
        } else if (dataType.matches("CHAR\\((\\d+)\\)")) {
            String length = dataType.replaceAll("CHAR\\((\\d+)\\)", "$1");
            colMapping.setTargetDataLength(Integer.parseInt(length));
        }
        
        // Extract precision and scale from NUMERIC(p,s) or NUMERIC(p)
        if (dataType.matches("NUMERIC\\((\\d+),(\\d+)\\)")) {
            String[] parts = dataType.replaceAll("NUMERIC\\((\\d+),(\\d+)\\)", "$1,$2").split(",");
            colMapping.setTargetDataPrecision(Integer.parseInt(parts[0]));
            colMapping.setTargetDataScale(Integer.parseInt(parts[1]));
        } else if (dataType.matches("NUMERIC\\((\\d+)\\)")) {
            String precision = dataType.replaceAll("NUMERIC\\((\\d+)\\)", "$1");
            colMapping.setTargetDataPrecision(Integer.parseInt(precision));
        }
    }
}

