package com.ora2pg.migration.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ColumnMapping {
    private String id;
    private String sourceColumn;
    private String sourceDataType;
    private Integer sourceDataLength;
    private Integer sourceDataPrecision;
    private Integer sourceDataScale;
    private String targetColumn;
    private String targetDataType;
    private Integer targetDataLength;
    private Integer targetDataPrecision;
    private Integer targetDataScale;
    private String transformation;
    private Boolean nullable;
    private Boolean isPrimaryKey;
    private Boolean isForeignKey;
}

