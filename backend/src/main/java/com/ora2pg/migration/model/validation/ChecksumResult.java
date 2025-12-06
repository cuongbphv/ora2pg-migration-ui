package com.ora2pg.migration.model.validation;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChecksumResult {
    private String table;
    private String sourceSchema;
    private String targetSchema;
    private String sourceChecksum;
    private String targetChecksum;
    private Boolean match;
    private String algorithm; // "MD5", "SHA256", "SHA512"
    private String status; // "valid", "invalid", "error"
    private String errorMessage;
    private Long rowCount;
}

