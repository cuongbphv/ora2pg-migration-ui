package com.ora2pg.migration.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ora2pg.migration.model.pg2pg.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class Pg2PgJsonImportService {
    
    private final ObjectMapper objectMapper;
    
    public Pg2PgJsonImportService() {
        this.objectMapper = new ObjectMapper();
    }
    
    /**
     * Converts JSON mapping file to PipelineStep
     */
    public PipelineStep convertJsonToPipelineStep(String jsonContent) {
        try {
            Pg2PgMapping mapping = objectMapper.readValue(jsonContent, Pg2PgMapping.class);
            
            PipelineStep step = new PipelineStep();
            step.setSourceSchema(mapping.getSource_schema());
            step.setSourceTable(mapping.getSource_table());
            step.setTargetSchema(mapping.getTarget_schema());
            step.setTargetTable(mapping.getTarget_table());
            step.setDescription(mapping.getDescription());
            step.setStatus("draft");
            step.setOrder(0);
            
            // Map filter
            if (mapping.getFilter() != null) {
                Pg2PgFilter filter = mapping.getFilter();
                step.setFilterEnabled(filter.isEnabled());
                step.setFilterWhereClause(filter.getWhere_clause());
                step.setFilterDescription(filter.getDescription());
            }
            
            // Map options
            if (mapping.getOptions() != null) {
                Pg2PgOptions options = mapping.getOptions();
                step.setDisableTriggers(options.isDisable_triggers());
                step.setDisableConstraints(options.isDisable_constraints());
            }
            
            // Map column mappings
            List<Pg2PgColumnMapping> columnMappings = new ArrayList<>();
            if (mapping.getColumn_mappings() != null) {
                for (Map.Entry<String, Pg2PgColumnMappingJson> entry : mapping.getColumn_mappings().entrySet()) {
                    String sourceColumn = entry.getKey();
                    Pg2PgColumnMappingJson columnMappingJson = entry.getValue();
                    
                    Pg2PgColumnMapping columnMapping = convertColumnMapping(sourceColumn, columnMappingJson);
                    if (columnMapping != null) {
                        columnMappings.add(columnMapping);
                    }
                }
            }
            step.setColumnMappings(columnMappings);
            
            return step;
        } catch (Exception e) {
            log.error("Failed to convert JSON to PipelineStep", e);
            throw new RuntimeException("Failed to parse JSON mapping: " + e.getMessage(), e);
        }
    }
    
    /**
     * Converts a column mapping object from JSON to Pg2PgColumnMapping
     */
    private Pg2PgColumnMapping convertColumnMapping(String sourceColumn, Pg2PgColumnMappingJson columnMappingJson) {
        try {
            Pg2PgColumnMapping mapping = new Pg2PgColumnMapping();
            
            // Source column - remove quotes if present
            String cleanSourceColumn = sourceColumn.trim();
            if (cleanSourceColumn.startsWith("'") && cleanSourceColumn.endsWith("'")) {
                cleanSourceColumn = cleanSourceColumn.substring(1, cleanSourceColumn.length() - 1);
            }
            mapping.setSourceColumn(cleanSourceColumn);
            
            // Target column
            if (columnMappingJson.getTarget_column() != null) {
                mapping.setTargetColumn(columnMappingJson.getTarget_column());
            } else {
                mapping.setTargetColumn(cleanSourceColumn); // Default to source column name
            }
            
            // Target data type
            if (columnMappingJson.getTarget_type() != null) {
                mapping.setTargetDataType(columnMappingJson.getTarget_type());
            }
            
            // Source data type - try to infer from target type or use default
            // In JSON, we might not have source type, so we'll leave it null or infer
            mapping.setSourceDataType("VARCHAR"); // Default, can be updated later
            
            // Transformation
            if (columnMappingJson.getTransformation() != null && !columnMappingJson.getTransformation().trim().isEmpty()) {
                mapping.setTransformation(columnMappingJson.getTransformation());
                mapping.setTransformationType(determineTransformationType(columnMappingJson.getTransformation()));
            } else {
                mapping.setTransformationType("direct");
            }
            
            // Description
            mapping.setDescription(columnMappingJson.getDescription());
            
            // Default values
            mapping.setNullable(true);
            mapping.setIsPrimaryKey(false);
            mapping.setIsForeignKey(false);
            
            return mapping;
        } catch (Exception e) {
            log.error("Failed to convert column mapping for source column: " + sourceColumn, e);
            return null;
        }
    }
    
    /**
     * Determines transformation type based on transformation expression
     */
    private String determineTransformationType(String transformation) {
        if (transformation == null || transformation.trim().isEmpty()) {
            return "direct";
        }
        
        String lowerTrans = transformation.toLowerCase().trim();
        
        if (lowerTrans.startsWith("case") || lowerTrans.contains("when")) {
            return "case-when";
        } else if (lowerTrans.startsWith("select") || lowerTrans.contains("from")) {
            return "subquery";
        } else if (lowerTrans.startsWith("'") && lowerTrans.endsWith("'")) {
            return "static";
        } else if (lowerTrans.contains("||") || lowerTrans.contains("concat")) {
            return "concat";
        } else if (lowerTrans.contains("::") || lowerTrans.contains("cast")) {
            return "type-cast";
        } else if (lowerTrans.contains("coalesce")) {
            return "coalesce";
        } else if (lowerTrans.contains("(") && lowerTrans.contains(")")) {
            return "function";
        } else {
            return "direct";
        }
    }
}

