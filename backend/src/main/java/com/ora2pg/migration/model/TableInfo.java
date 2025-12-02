package com.ora2pg.migration.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TableInfo {
    private String tableName;
    private String schema;
    private Long rowCount;
    private List<ColumnInfo> columns;
    
    public TableInfo(String tableName, String schema) {
        this.tableName = tableName;
        this.schema = schema;
        this.columns = new ArrayList<>();
    }
}

