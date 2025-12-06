package com.ora2pg.migration.model.schema;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SequenceInfo {
    private String sequenceName;
    private String schema;
    private BigDecimal minValue; // Use BigDecimal to handle large Oracle NUMBER values
    private BigDecimal maxValue;
    private BigDecimal incrementBy;
    private BigDecimal startWith;
    private Boolean cycle; // CYCLE or NOCYCLE
    private Boolean order; // ORDER or NOORDER
    private BigDecimal cacheSize;
    private BigDecimal lastNumber; // Current value
}

