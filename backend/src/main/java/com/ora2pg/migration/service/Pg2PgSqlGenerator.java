package com.ora2pg.migration.service;

import com.ora2pg.migration.model.pg2pg.Pg2PgColumnMapping;
import com.ora2pg.migration.model.pg2pg.PipelineStep;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
public class Pg2PgSqlGenerator {
    
    private static final DateTimeFormatter TIMESTAMP_FORMATTER = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
    
    /**
     * Generates SQL migration script from pipeline step configuration
     */
    public String generateMigrationSql(PipelineStep step, String timestamp) {
        StringBuilder sql = new StringBuilder();
        
        // Header comments
        sql.append("-- Migration script for ").append(step.getSourceSchema()).append(".")
           .append(step.getSourceTable()).append(" to ").append(step.getTargetSchema()).append(".")
           .append(step.getTargetTable()).append("\n");
        sql.append("-- Generated at ").append(LocalDateTime.now()).append("\n");
        sql.append("-- Job Timestamp: ").append(timestamp).append("\n");
        
        if (step.getFilterEnabled() != null && step.getFilterEnabled() && step.getFilterWhereClause() != null) {
            sql.append("-- FILTER ENABLED: ").append(step.getFilterWhereClause()).append("\n");
        }
        
        sql.append("\n");
        
        // Set search_path
        sql.append("-- 1. Set search_path to include both schemas\n");
        sql.append("SET search_path TO ").append(quoteIdentifier(step.getTargetSchema()))
           .append(", ").append(quoteIdentifier(step.getSourceSchema())).append(", public;\n\n");
        
        // Begin transaction
        sql.append("-- 2. Begin transaction\n");
        sql.append("BEGIN;\n\n");
        
        // Build column mappings
        List<String> targetColumns = new ArrayList<>();
        List<String> sourceExpressions = new ArrayList<>();
        
        for (Pg2PgColumnMapping mapping : step.getColumnMappings()) {
            targetColumns.add(quoteIdentifier(mapping.getTargetColumn()));
            
            String sourceExpr = buildSourceExpression(mapping);
            sourceExpressions.add(sourceExpr);
        }
        
        String targetColsStr = String.join(", ", targetColumns);
        String sourceExprsStr = String.join(", ", sourceExpressions);
        
        // Check if target table exists (we'll need to query this, but for now assume it might exist)
        sql.append("-- 3. Handle target table (create if not exists, backup if exists)\n");
        sql.append("DO $$\n");
        sql.append("DECLARE\n");
        sql.append("    table_exists boolean;\n");
        sql.append("    backup_table_name text;\n");
        sql.append("BEGIN\n");
        sql.append("    SELECT EXISTS (\n");
        sql.append("        SELECT FROM information_schema.tables\n");
        sql.append("        WHERE table_schema = '").append(step.getTargetSchema()).append("'\n");
        sql.append("        AND table_name = '").append(step.getTargetTable()).append("'\n");
        sql.append("    ) INTO table_exists;\n\n");
        
        sql.append("    IF table_exists THEN\n");
        sql.append("        backup_table_name := '").append(step.getTargetTable()).append("_").append(timestamp).append("';\n");
        sql.append("        EXECUTE format('CREATE TABLE %I.%I AS SELECT * FROM %I.%I',\n");
        sql.append("            '").append(step.getTargetSchema()).append("', backup_table_name,\n");
        sql.append("            '").append(step.getTargetSchema()).append("', '").append(step.getTargetTable()).append("');\n");
        sql.append("        RAISE NOTICE 'Backed up existing table to %', backup_table_name;\n");
        sql.append("    ELSE\n");
        sql.append("        -- Create target table\n");
        
        // Build CREATE TABLE statement as EXECUTE with proper escaping
        StringBuilder createTableSql = new StringBuilder("CREATE TABLE ");
        createTableSql.append(quoteIdentifier(step.getTargetSchema()))
                      .append(".").append(quoteIdentifier(step.getTargetTable()))
                      .append(" (");
        
        for (int i = 0; i < step.getColumnMappings().size(); i++) {
            Pg2PgColumnMapping mapping = step.getColumnMappings().get(i);
            if (i > 0) createTableSql.append(", ");
            createTableSql.append(quoteIdentifier(mapping.getTargetColumn()))
                         .append(" ").append(mapping.getTargetDataType());
        }
        createTableSql.append(", ").append(quoteIdentifier("job_timestamp")).append(" TIMESTAMP");
        createTableSql.append(")");
        
        // Escape single quotes for EXECUTE
        String escapedSql = createTableSql.toString().replace("'", "''");
        sql.append("        EXECUTE '").append(escapedSql).append("';\n");
        sql.append("        RAISE NOTICE 'Created target table';\n");
        sql.append("    END IF;\n\n");
        
        // Add job_timestamp column if it doesn't exist
        sql.append("    -- Ensure job_timestamp column exists\n");
        sql.append("    IF NOT EXISTS (\n");
        sql.append("        SELECT FROM information_schema.columns\n");
        sql.append("        WHERE table_schema = '").append(step.getTargetSchema()).append("'\n");
        sql.append("        AND table_name = '").append(step.getTargetTable()).append("'\n");
        sql.append("        AND column_name = 'job_timestamp'\n");
        sql.append("    ) THEN\n");
        sql.append("        EXECUTE format('ALTER TABLE %I.%I ADD COLUMN %I TIMESTAMP',\n");
        sql.append("            '").append(step.getTargetSchema()).append("', '").append(step.getTargetTable()).append("', 'job_timestamp');\n");
        sql.append("        RAISE NOTICE 'Added job_timestamp column';\n");
        sql.append("    END IF;\n");
        sql.append("END $$;\n\n");
        
        // Handle triggers and constraints if needed
        if (step.getDisableTriggers() != null && step.getDisableTriggers()) {
            sql.append("-- 4. Disable triggers\n");
            sql.append("SET session_replication_role = 'replica';\n\n");
        }
        
        if (step.getDisableConstraints() != null && step.getDisableConstraints()) {
            sql.append("-- 5. Disable constraints\n");
            sql.append("SET CONSTRAINTS ALL DEFERRED;\n\n");
        }
        
        // Insert data
        sql.append("-- 6. Insert data with job timestamp\n");
        sql.append("DO $$\n");
        sql.append("DECLARE\n");
        sql.append("    migration_timestamp TIMESTAMP := CURRENT_TIMESTAMP;\n");
        sql.append("    insertion_count INTEGER;\n");
        sql.append("BEGIN\n");
        sql.append("    CREATE TEMP TABLE migration_timestamp_ref(ts TIMESTAMP);\n");
        sql.append("    INSERT INTO migration_timestamp_ref VALUES (migration_timestamp);\n\n");
        
        sql.append("    INSERT INTO ").append(quoteIdentifier(step.getTargetSchema()))
           .append(".").append(quoteIdentifier(step.getTargetTable()))
           .append(" (").append(targetColsStr).append(", ").append(quoteIdentifier("job_timestamp")).append(")\n");
        sql.append("    SELECT ").append(sourceExprsStr).append(", migration_timestamp\n");
        sql.append("    FROM ").append(quoteIdentifier(step.getSourceSchema()))
           .append(".").append(quoteIdentifier(step.getSourceTable())).append("\n");
        
        if (step.getFilterEnabled() != null && step.getFilterEnabled() && step.getFilterWhereClause() != null) {
            sql.append("    WHERE ").append(step.getFilterWhereClause()).append("\n");
        }
        sql.append("    ;\n\n");
        
        sql.append("    GET DIAGNOSTICS insertion_count = ROW_COUNT;\n");
        sql.append("    RAISE NOTICE 'Inserted % rows', insertion_count;\n");
        sql.append("END $$;\n\n");
        
        // Re-enable triggers and constraints
        if (step.getDisableTriggers() != null && step.getDisableTriggers()) {
            sql.append("-- 7. Re-enable triggers\n");
            sql.append("RESET session_replication_role;\n\n");
        }
        
        if (step.getDisableConstraints() != null && step.getDisableConstraints()) {
            sql.append("-- 8. Re-enable constraints\n");
            sql.append("SET CONSTRAINTS ALL IMMEDIATE;\n\n");
        }
        
        // Commit
        sql.append("-- 9. Commit transaction\n");
        sql.append("COMMIT;\n\n");
        
        // Statistics
        if (step.getFilterEnabled() != null && step.getFilterEnabled() && step.getFilterWhereClause() != null) {
            sql.append("SELECT (SELECT COUNT(*) FROM ").append(quoteIdentifier(step.getSourceSchema()))
               .append(".").append(quoteIdentifier(step.getSourceTable()))
               .append(" WHERE ").append(step.getFilterWhereClause()).append(") AS source_count;\n");
        } else {
            sql.append("SELECT COUNT(*) AS source_count FROM ").append(quoteIdentifier(step.getSourceSchema()))
               .append(".").append(quoteIdentifier(step.getSourceTable())).append(";\n");
        }
        sql.append("SELECT COUNT(*) AS target_count FROM ").append(quoteIdentifier(step.getTargetSchema()))
           .append(".").append(quoteIdentifier(step.getTargetTable())).append(";\n");
        // Note: we rely on insertion_count from the DO block for migrated rows and avoid
        // referencing job_timestamp here to prevent errors when the column is missing.
        
        return sql.toString();
    }
    
    /**
     * Builds source expression from column mapping, applying transformations
     */
    private String buildSourceExpression(Pg2PgColumnMapping mapping) {
        String sourceCol = quoteIdentifier(mapping.getSourceColumn());
        
        if (mapping.getTransformation() != null && !mapping.getTransformation().trim().isEmpty()) {
            // Apply transformation, replacing %s or {sourceColumn} with actual column reference
            String transformation = mapping.getTransformation();
            
            // Handle different placeholder patterns
            transformation = transformation.replace("%s", sourceCol);
            transformation = transformation.replace("{sourceColumn}", sourceCol);
            transformation = transformation.replace("${sourceColumn}", sourceCol);
            
            // If transformation contains the source column name directly (for CASE WHEN, etc.)
            if (!transformation.contains(sourceCol) && !transformation.contains("\"" + mapping.getSourceColumn() + "\"")) {
                // Try to find and replace the column name in the transformation
                transformation = transformation.replace(mapping.getSourceColumn(), sourceCol);
            }
            
            return transformation;
        } else {
            // Direct mapping
            return sourceCol;
        }
    }
    
    /**
     * Quotes PostgreSQL identifier
     */
    private String quoteIdentifier(String identifier) {
        if (identifier == null || identifier.isEmpty()) {
            return "\"\"";
        }
        // Remove existing quotes if present
        identifier = identifier.replace("\"", "");
        return "\"" + identifier + "\"";
    }
}

