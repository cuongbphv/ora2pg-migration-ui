package com.ora2pg.migration.service;

import com.ora2pg.migration.model.*;
import com.ora2pg.migration.model.schema.*;
import com.ora2pg.migration.util.DatabaseConnectionManager;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.sql.*;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
public class SchemaMigrationService {
    
    @Autowired
    private DatabaseConnectionManager connectionManager;
    
    @Autowired
    private ProjectService projectService;
    
    /**
     * Discover and generate DDL for all schema objects
     */
    public List<SchemaObject> generateSchemaDDL(SchemaMigrationRequest request) {
        List<SchemaObject> schemaObjects = new ArrayList<>();
        
        try {
            Project project = projectService.getProjectById(request.getProjectId());
            if (project.getSourceConnection() == null) {
                throw new RuntimeException("Source connection not configured");
            }
            
            String sourceSchema = project.getSourceConnection().getSchema();
            String targetSchema = request.getTargetSchema() != null ? request.getTargetSchema() : "public";
            
            // Get table mappings to know which tables to process
            List<TableMapping> tableMappings = project.getTableMappings();
            List<String> tableNames = null;
            if (request.getTableNames() != null && !request.getTableNames().isEmpty()) {
                tableNames = request.getTableNames();
            } else if (tableMappings != null && !tableMappings.isEmpty()) {
                tableNames = tableMappings.stream()
                    .map(TableMapping::getSourceTable)
                    .collect(Collectors.toList());
            }
            
            try (Connection conn = connectionManager.getConnection(project.getSourceConnection())) {
                // Discover indexes
                if (request.getIncludeIndexes() != null && request.getIncludeIndexes()) {
                    List<IndexInfo> indexes = discoverIndexes(conn, sourceSchema, tableNames);
                    for (IndexInfo index : indexes) {
                        SchemaObject obj = new SchemaObject();
                        obj.setName(index.getIndexName());
                        obj.setSchema(sourceSchema);
                        obj.setType("index");
                        obj.setStatus("generated");
                        obj.setTargetSchema(targetSchema);
                        obj.setDdl(generateIndexDDL(index, targetSchema));
                        obj.setIssues(checkIndexIssues(index));
                        schemaObjects.add(obj);
                    }
                    log.info("Discovered indexes for project {} with total {}", project.getName(), indexes.size());
                }

                // Discover constraints
                if (request.getIncludeConstraints() != null && request.getIncludeConstraints()) {
                    List<ConstraintInfo> constraints = discoverConstraints(conn, sourceSchema, tableNames);
                    for (ConstraintInfo constraint : constraints) {
                        SchemaObject obj = new SchemaObject();
                        obj.setName(constraint.getConstraintName());
                        obj.setSchema(sourceSchema);
                        obj.setType("constraint");
                        obj.setStatus("generated");
                        obj.setTargetSchema(targetSchema);
                        obj.setDdl(generateConstraintDDL(constraint, targetSchema));
                        obj.setIssues(checkConstraintIssues(constraint));
                        schemaObjects.add(obj);
                    }
                    log.info("Discovered constraints for project {} with total {}", project.getName(), constraints.size());
                }
                
                // Discover sequences
                if (request.getIncludeSequences() != null && request.getIncludeSequences()) {
                    List<SequenceInfo> sequences = discoverSequences(conn, sourceSchema);
                    for (SequenceInfo sequence : sequences) {
                        SchemaObject obj = new SchemaObject();
                        obj.setName(sequence.getSequenceName());
                        obj.setSchema(sourceSchema);
                        obj.setType("sequence");
                        obj.setStatus("generated");
                        obj.setTargetSchema(targetSchema);
                        obj.setDdl(generateSequenceDDL(sequence, targetSchema));
                        obj.setIssues(new ArrayList<>());
                        schemaObjects.add(obj);
                    }
                    log.info("Discovered sequences for project {} with total {}", project.getName(), sequences.size());
                }
                
                // Discover views
                if (request.getIncludeViews() != null && request.getIncludeViews()) {
                    List<ViewInfo> views = discoverViews(conn, sourceSchema);
                    for (ViewInfo view : views) {
                        SchemaObject obj = new SchemaObject();
                        obj.setName(view.getViewName());
                        obj.setSchema(sourceSchema);
                        obj.setType("view");
                        obj.setStatus("generated");
                        obj.setTargetSchema(targetSchema);
                        String convertedSql = convertViewSQL(view.getViewDefinition());
                        obj.setDdl(generateViewDDL(view, convertedSql, targetSchema));
                        obj.setIssues(checkViewIssues(view.getViewDefinition()));
                        obj.setSourceDdl(view.getViewDefinition());
                        schemaObjects.add(obj);
                    }
                    log.info("Discovered views for project {} with total {}", project.getName(), views.size());
                }
            }
            
        } catch (Exception e) {
            log.error("Error generating schema DDL: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to generate schema DDL: " + e.getMessage(), e);
        }
        
        return schemaObjects;
    }
    
    // Discovery methods
    
    private List<IndexInfo> discoverIndexes(Connection conn, String schema, List<String> tableNames) throws SQLException {
        List<IndexInfo> indexes = new ArrayList<>();
        
        StringBuilder sql = new StringBuilder("""
            SELECT 
                i.index_name,
                i.table_name,
                i.uniqueness,
                i.index_type,
                i.tablespace_name,
                i.status,
                ic.column_name,
                ic.column_position,
                ic.descend
            FROM all_indexes i
            JOIN all_ind_columns ic ON i.index_name = ic.index_name 
                AND i.table_owner = ic.table_owner
                AND i.table_name = ic.table_name
            WHERE i.table_owner = UPPER(?)
                AND i.index_type != 'LOB'
        """);
        
        if (tableNames != null && !tableNames.isEmpty()) {
            sql.append(" AND i.table_name IN (");
            for (int i = 0; i < tableNames.size(); i++) {
                if (i > 0) sql.append(", ");
                sql.append("UPPER(?)");
            }
            sql.append(")");
        }
        
        sql.append(" ORDER BY i.index_name, ic.column_position");
        
        try (PreparedStatement stmt = conn.prepareStatement(sql.toString())) {
            int paramIndex = 1;
            stmt.setString(paramIndex++, schema);
            if (tableNames != null && !tableNames.isEmpty()) {
                for (String tableName : tableNames) {
                    stmt.setString(paramIndex++, tableName);
                }
            }
            
            Map<String, IndexInfo> indexMap = new LinkedHashMap<>();
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    String indexName = rs.getString("index_name");
                    IndexInfo index = indexMap.get(indexName);
                    
                    if (index == null) {
                        index = new IndexInfo();
                        index.setIndexName(indexName);
                        index.setTableName(rs.getString("table_name"));
                        index.setTableSchema(schema);
                        index.setUnique("UNIQUE".equalsIgnoreCase(rs.getString("uniqueness")));
                        index.setIndexType(rs.getString("index_type"));
                        index.setTablespace(rs.getString("tablespace_name"));
                        index.setStatus(rs.getString("status"));
                        indexMap.put(indexName, index);
                    }
                    
                    String columnName = rs.getString("column_name");
                    if (columnName != null) {
                        index.getColumns().add(columnName);
                    }
                }
            }
            
            indexes.addAll(indexMap.values());
        }
        
        return indexes;
    }
    
    private List<ConstraintInfo> discoverConstraints(Connection conn, String schema, List<String> tableNames) throws SQLException {
        List<ConstraintInfo> constraints = new ArrayList<>();
        
        StringBuilder sql = new StringBuilder("""
            SELECT 
                c.constraint_name,
                c.table_name,
                c.constraint_type,
                c.status,
                c.search_condition,
                cc.column_name,
                cc.position,
                r.table_name as r_table_name,
                c.delete_rule,
                c.deferrable,
                c.deferred
            FROM all_constraints c
            LEFT JOIN all_cons_columns cc ON c.constraint_name = cc.constraint_name 
                AND c.owner = cc.owner
            LEFT JOIN all_constraints r ON c.r_constraint_name = r.constraint_name
                AND c.r_owner = r.owner
            WHERE c.owner = UPPER(?)
                AND c.constraint_type IN ('P', 'R', 'U', 'C')
        """);
        
        if (tableNames != null && !tableNames.isEmpty()) {
            sql.append(" AND c.table_name IN (");
            for (int i = 0; i < tableNames.size(); i++) {
                if (i > 0) sql.append(", ");
                sql.append("UPPER(?)");
            }
            sql.append(")");
        }
        
        sql.append(" ORDER BY c.constraint_name, cc.position");
        
        try (PreparedStatement stmt = conn.prepareStatement(sql.toString())) {
            int paramIndex = 1;
            stmt.setString(paramIndex++, schema);
            if (tableNames != null && !tableNames.isEmpty()) {
                for (String tableName : tableNames) {
                    stmt.setString(paramIndex++, tableName);
                }
            }
            
            Map<String, ConstraintInfo> constraintMap = new LinkedHashMap<>();
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    String constraintName = rs.getString("constraint_name");
                    ConstraintInfo constraint = constraintMap.get(constraintName);
                    
                    if (constraint == null) {
                        constraint = new ConstraintInfo();
                        constraint.setConstraintName(constraintName);
                        constraint.setTableName(rs.getString("table_name"));
                        constraint.setTableSchema(schema);
                        
                        String constraintType = rs.getString("constraint_type");
                        switch (constraintType) {
                            case "P" -> constraint.setConstraintType("PRIMARY KEY");
                            case "R" -> constraint.setConstraintType("FOREIGN KEY");
                            case "U" -> constraint.setConstraintType("UNIQUE");
                            case "C" -> constraint.setConstraintType("CHECK");
                        }
                        
                        constraint.setStatus(rs.getString("status"));
                        constraint.setCheckCondition(rs.getString("search_condition"));
                        constraint.setDeleteRule(rs.getString("delete_rule"));
                        
                        if ("FOREIGN KEY".equals(constraint.getConstraintType())) {
                            constraint.setReferencedTable(rs.getString("r_table_name"));
                            constraint.setReferencedSchema(schema); // Assume same schema for now
                        }
                        
                        constraintMap.put(constraintName, constraint);
                    }
                    
                    String columnName = rs.getString("column_name");
                    if (columnName != null && !constraint.getColumns().contains(columnName)) {
                        constraint.getColumns().add(columnName);
                    }
                }
            }
            
            constraints.addAll(constraintMap.values());
            
            // For foreign keys, get referenced columns separately
            for (ConstraintInfo constraint : constraints) {
                if ("FOREIGN KEY".equals(constraint.getConstraintType()) && 
                    constraint.getReferencedTable() != null) {
                    // Get referenced columns from the referenced table's primary key
                    String refSql = """
                        SELECT column_name, position
                        FROM all_cons_columns
                        WHERE owner = UPPER(?)
                            AND constraint_name = (
                                SELECT constraint_name
                                FROM all_constraints
                                WHERE owner = UPPER(?)
                                    AND table_name = UPPER(?)
                                    AND constraint_type = 'P'
                            )
                        ORDER BY position
                    """;
                    try (PreparedStatement refStmt = conn.prepareStatement(refSql)) {
                        refStmt.setString(1, schema);
                        refStmt.setString(2, schema);
                        refStmt.setString(3, constraint.getReferencedTable());
                        try (ResultSet refRs = refStmt.executeQuery()) {
                            while (refRs.next()) {
                                constraint.getReferencedColumns().add(refRs.getString("column_name"));
                            }
                        }
                    } catch (SQLException e) {
                        log.warn("Failed to get referenced columns for FK {}: {}", 
                            constraint.getConstraintName(), e.getMessage());
                    }
                }
            }
        }
        
        return constraints;
    }
    
    private List<SequenceInfo> discoverSequences(Connection conn, String schema) throws SQLException {
        List<SequenceInfo> sequences = new ArrayList<>();
        
        String sql = """
            SELECT 
                sequence_name,
                min_value,
                max_value,
                increment_by,
                cycle_flag,
                order_flag,
                cache_size,
                last_number
            FROM all_sequences
            WHERE sequence_owner = UPPER(?)
            ORDER BY sequence_name
        """;
        
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, schema);
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    SequenceInfo seq = new SequenceInfo();
                    seq.setSequenceName(rs.getString("sequence_name"));
                    seq.setSchema(schema);
                    
                    // Use getBigDecimal to handle large Oracle NUMBER values safely
                    try {
                        seq.setMinValue(rs.getBigDecimal("min_value"));
                    } catch (SQLException e) {
                        log.warn("Failed to get min_value for sequence {}: {}", 
                            seq.getSequenceName(), e.getMessage());
                        seq.setMinValue(null);
                    }
                    
                    try {
                        seq.setMaxValue(rs.getBigDecimal("max_value"));
                    } catch (SQLException e) {
                        log.warn("Failed to get max_value for sequence {}: {}", 
                            seq.getSequenceName(), e.getMessage());
                        seq.setMaxValue(null);
                    }
                    
                    try {
                        seq.setIncrementBy(rs.getBigDecimal("increment_by"));
                    } catch (SQLException e) {
                        log.warn("Failed to get increment_by for sequence {}: {}", 
                            seq.getSequenceName(), e.getMessage());
                        seq.setIncrementBy(BigDecimal.ONE);
                    }
                    
                    seq.setCycle("Y".equalsIgnoreCase(rs.getString("cycle_flag")));
                    seq.setOrder("Y".equalsIgnoreCase(rs.getString("order_flag")));
                    
                    try {
                        seq.setCacheSize(rs.getBigDecimal("cache_size"));
                    } catch (SQLException e) {
                        log.warn("Failed to get cache_size for sequence {}: {}", 
                            seq.getSequenceName(), e.getMessage());
                        seq.setCacheSize(BigDecimal.valueOf(20)); // Default cache
                    }
                    
                    try {
                        seq.setLastNumber(rs.getBigDecimal("last_number"));
                        seq.setStartWith(seq.getLastNumber()); // Use current value as start
                    } catch (SQLException e) {
                        log.warn("Failed to get last_number for sequence {}: {}", 
                            seq.getSequenceName(), e.getMessage());
                        seq.setLastNumber(null);
                        seq.setStartWith(BigDecimal.ONE); // Default start
                    }
                    
                    sequences.add(seq);
                }
            }
        }
        
        return sequences;
    }
    
    private List<ViewInfo> discoverViews(Connection conn, String schema) throws SQLException {
        List<ViewInfo> views = new ArrayList<>();
        
        String sql = """
            SELECT 
                view_name,
                text
            FROM all_views
            WHERE owner = UPPER(?)
            ORDER BY view_name
        """;
        
        try (PreparedStatement stmt = conn.prepareStatement(sql)) {
            stmt.setString(1, schema);
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    ViewInfo view = new ViewInfo();
                    view.setViewName(rs.getString("view_name"));
                    view.setSchema(schema);
                    
                    // Get view text - for LONG columns, use getCharacterStream
                    StringBuilder viewText = new StringBuilder();
                    try {
                        // Try to get as string first
                        String text = rs.getString("text");
                        if (text != null) {
                            viewText.append(text);
                        }
                    } catch (SQLException e) {
                        // If string fails (LONG column), try character stream
                        try (java.io.Reader reader = rs.getCharacterStream("text")) {
                            if (reader != null) {
                                char[] buffer = new char[8192];
                                int charsRead;
                                while ((charsRead = reader.read(buffer)) != -1) {
                                    viewText.append(buffer, 0, charsRead);
                                }
                            }
                        } catch (java.io.IOException ioE) {
                            log.warn("Failed to read view text for {}: {}", view.getViewName(), ioE.getMessage());
                        }
                    }
                    
                    String viewDef = viewText.toString();
                    view.setViewDefinition(viewDef);
                    
                    // Parse view definition to detect WITH CHECK OPTION and WITH READ ONLY
                    String upperDef = viewDef.toUpperCase();
                    view.setCheckOption(upperDef.contains("WITH CHECK OPTION"));
                    view.setReadOnly(upperDef.contains("WITH READ ONLY"));
                    
                    view.setStatus("VALID"); // Assume valid if we can read it
                    views.add(view);
                }
            }
        }
        
        return views;
    }
    
    // DDL Generation methods
    
    private String generateIndexDDL(IndexInfo index, String targetSchema) {
        StringBuilder ddl = new StringBuilder();
        
        // Handle bitmap indexes - PostgreSQL doesn't support them
        if ("BITMAP".equalsIgnoreCase(index.getIndexType())) {
            ddl.append("-- WARNING: Bitmap index converted to B-tree (PostgreSQL doesn't support bitmap)\n");
        }
        
        if (index.isUnique()) {
            ddl.append("CREATE UNIQUE INDEX ");
        } else {
            ddl.append("CREATE INDEX ");
        }
        
        // Quote index name
        String indexName = quoteIdentifier("postgresql", index.getIndexName());
        ddl.append(indexName).append(" ON ");
        
        // Quote table name
        String tableName = quoteIdentifier("postgresql", index.getTableName());
        ddl.append(targetSchema).append(".").append(tableName).append(" (");
        
        // Add columns
        for (int i = 0; i < index.getColumns().size(); i++) {
            if (i > 0) ddl.append(", ");
            String col = quoteIdentifier("postgresql", index.getColumns().get(i));
            ddl.append(col);
        }
        
        ddl.append(");");
        return ddl.toString();
    }
    
    private String generateConstraintDDL(ConstraintInfo constraint, String targetSchema) {
        StringBuilder ddl = new StringBuilder();
        String tableName = quoteIdentifier("postgresql", constraint.getTableName());
        String constraintName = quoteIdentifier("postgresql", constraint.getConstraintName());
        
        switch (constraint.getConstraintType()) {
            case "PRIMARY KEY" -> {
                ddl.append("ALTER TABLE ").append(targetSchema).append(".").append(tableName)
                   .append(" ADD CONSTRAINT ").append(constraintName)
                   .append(" PRIMARY KEY (");
                ddl.append(constraint.getColumns().stream()
                    .map(col -> quoteIdentifier("postgresql", col))
                    .collect(Collectors.joining(", ")));
                ddl.append(");");
            }
            case "FOREIGN KEY" -> {
                ddl.append("ALTER TABLE ").append(targetSchema).append(".").append(tableName)
                   .append(" ADD CONSTRAINT ").append(constraintName)
                   .append(" FOREIGN KEY (");
                ddl.append(constraint.getColumns().stream()
                    .map(col -> quoteIdentifier("postgresql", col))
                    .collect(Collectors.joining(", ")));
                ddl.append(") REFERENCES ").append(targetSchema).append(".")
                   .append(quoteIdentifier("postgresql", constraint.getReferencedTable()))
                   .append(" (");
                ddl.append(constraint.getReferencedColumns().stream()
                    .map(col -> quoteIdentifier("postgresql", col))
                    .collect(Collectors.joining(", ")));
                ddl.append(")");
                
                // Add delete/update rules
                if (constraint.getDeleteRule() != null) {
                    String rule = convertDeleteRule(constraint.getDeleteRule());
                    if (rule != null) {
                        ddl.append(" ON DELETE ").append(rule);
                    }
                }
                ddl.append(";");
            }
            case "UNIQUE" -> {
                ddl.append("ALTER TABLE ").append(targetSchema).append(".").append(tableName)
                   .append(" ADD CONSTRAINT ").append(constraintName)
                   .append(" UNIQUE (");
                ddl.append(constraint.getColumns().stream()
                    .map(col -> quoteIdentifier("postgresql", col))
                    .collect(Collectors.joining(", ")));
                ddl.append(");");
            }
            case "CHECK" -> {
                ddl.append("ALTER TABLE ").append(targetSchema).append(".").append(tableName)
                   .append(" ADD CONSTRAINT ").append(constraintName)
                   .append(" CHECK (");
                String condition = convertCheckCondition(constraint.getCheckCondition());
                ddl.append(condition);
                ddl.append(");");
            }
        }
        
        return ddl.toString();
    }
    
    private String generateSequenceDDL(SequenceInfo sequence, String targetSchema) {
        StringBuilder ddl = new StringBuilder();
        ddl.append("CREATE SEQUENCE ").append(targetSchema).append(".")
           .append(quoteIdentifier("postgresql", sequence.getSequenceName()));
        
        if (sequence.getStartWith() != null) {
            ddl.append(" START ").append(sequence.getStartWith().toPlainString());
        }
        
        if (sequence.getIncrementBy() != null) {
            ddl.append(" INCREMENT ").append(sequence.getIncrementBy().toPlainString());
        }
        
        if (sequence.getMinValue() != null) {
            ddl.append(" MINVALUE ").append(sequence.getMinValue().toPlainString());
        }
        
        if (sequence.getMaxValue() != null) {
            ddl.append(" MAXVALUE ").append(sequence.getMaxValue().toPlainString());
        }
        
        if (sequence.getCycle() != null) {
            ddl.append(sequence.getCycle() ? " CYCLE" : " NO CYCLE");
        }
        
        if (sequence.getCacheSize() != null) {
            // PostgreSQL cache must be >= 1, and we can't use very large values
            try {
                long cacheValue = sequence.getCacheSize().longValue();
                if (cacheValue > 1 && cacheValue <= Integer.MAX_VALUE) {
                    ddl.append(" CACHE ").append(cacheValue);
                } else {
                    ddl.append(" NO CACHE");
                }
            } catch (ArithmeticException e) {
                // Value too large for long, use NO CACHE
                ddl.append(" NO CACHE");
            }
        } else {
            ddl.append(" NO CACHE");
        }
        
        ddl.append(";");
        return ddl.toString();
    }
    
    private String generateViewDDL(ViewInfo view, String convertedSql, String targetSchema) {
        StringBuilder ddl = new StringBuilder();
        ddl.append("CREATE VIEW ").append(targetSchema).append(".")
           .append(quoteIdentifier("postgresql", view.getViewName()))
           .append(" AS\n");
        ddl.append(convertedSql);
        
        if (view.getCheckOption() != null && view.getCheckOption()) {
            ddl.append("\nWITH CHECK OPTION");
        }
        
        ddl.append(";");
        return ddl.toString();
    }
    
    // SQL Conversion helpers
    
    private String convertViewSQL(String oracleSql) {
        if (oracleSql == null) return "";
        
        String sql = oracleSql;
        
        // Convert common Oracle functions to PostgreSQL
        sql = sql.replaceAll("(?i)DECODE\\s*\\(", "CASE WHEN ");
        sql = sql.replaceAll("(?i)NVL\\s*\\(", "COALESCE(");
        sql = sql.replaceAll("(?i)TO_CHAR\\s*\\(", "TO_CHAR("); // Keep but may need adjustment
        sql = sql.replaceAll("(?i)TO_DATE\\s*\\(", "TO_TIMESTAMP(");
        sql = sql.replaceAll("(?i)ROWNUM", "ROW_NUMBER() OVER()");
        sql = sql.replaceAll("(?i)SYSDATE", "CURRENT_TIMESTAMP");
        sql = sql.replaceAll("(?i)SYSTIMESTAMP", "CURRENT_TIMESTAMP");
        sql = sql.replaceAll("(?i)DUAL", ""); // Remove DUAL table references
        
        // Convert CONNECT BY to recursive CTE (simplified - may need more work)
        // This is a complex conversion that would need more sophisticated parsing
        
        return sql;
    }
    
    private String convertCheckCondition(String condition) {
        if (condition == null) return "";
        
        String cond = condition;
        // Convert Oracle-specific functions
        cond = cond.replaceAll("(?i)NVL\\s*\\(", "COALESCE(");
        cond = cond.replaceAll("(?i)DECODE\\s*\\(", "CASE WHEN ");
        
        return cond;
    }
    
    private String convertDeleteRule(String rule) {
        if (rule == null) return null;
        
        switch (rule.toUpperCase()) {
            case "CASCADE" -> { return "CASCADE"; }
            case "SET NULL" -> { return "SET NULL"; }
            case "RESTRICT", "NO ACTION" -> { return "RESTRICT"; }
            default -> { return "RESTRICT"; }
        }
    }
    
    private String quoteIdentifier(String dbType, String identifier) {
        if (identifier == null || identifier.isEmpty()) {
            return "\"\"";
        }
        identifier = identifier.replace("\"", "");
        return "\"" + identifier + "\"";
    }
    
    // Issue checking methods
    
    private List<String> checkIndexIssues(IndexInfo index) {
        List<String> issues = new ArrayList<>();
        
        if ("BITMAP".equalsIgnoreCase(index.getIndexType())) {
            issues.add("Bitmap index converted to B-tree (PostgreSQL doesn't support bitmap indexes)");
        }
        
        if (index.getIndexType() != null && index.getIndexType().contains("FUNCTION")) {
            issues.add("Function-based index - verify expression compatibility");
        }
        
        return issues;
    }
    
    private List<String> checkConstraintIssues(ConstraintInfo constraint) {
        List<String> issues = new ArrayList<>();
        
        if ("DISABLED".equalsIgnoreCase(constraint.getStatus())) {
            issues.add("Constraint was disabled in Oracle - verify if it should be enabled");
        }
        
        if (constraint.getCheckCondition() != null && 
            constraint.getCheckCondition().toUpperCase().contains("DECODE")) {
            issues.add("Check condition contains DECODE - converted to CASE WHEN");
        }
        
        return issues;
    }
    
    private List<String> checkViewIssues(String viewDefinition) {
        List<String> issues = new ArrayList<>();
        
        if (viewDefinition == null) return issues;
        
        String upper = viewDefinition.toUpperCase();
        
        if (upper.contains("CONNECT BY")) {
            issues.add("Contains CONNECT BY - may need manual conversion to recursive CTE");
        }
        
        if (upper.contains("ROWNUM")) {
            issues.add("Contains ROWNUM - converted to ROW_NUMBER()");
        }
        
        if (upper.contains("DECODE")) {
            issues.add("Contains DECODE - converted to CASE WHEN");
        }
        
        if (upper.contains("DUAL")) {
            issues.add("Contains DUAL table - removed (not needed in PostgreSQL)");
        }
        
        return issues;
    }
}

