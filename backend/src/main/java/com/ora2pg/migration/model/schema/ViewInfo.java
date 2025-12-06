package com.ora2pg.migration.model.schema;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ViewInfo {
    private String viewName;
    private String schema;
    private String viewDefinition; // SQL query text
    private Boolean readOnly; // WITH READ ONLY
    private Boolean checkOption; // WITH CHECK OPTION
    private String status; // "VALID", "INVALID"
}

