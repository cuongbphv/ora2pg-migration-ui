package com.ora2pg.migration.config;

import com.ora2pg.migration.entity.DataTypeMappingRuleEntity;
import com.ora2pg.migration.entity.User;
import com.ora2pg.migration.repository.DataTypeMappingRuleRepository;
import com.ora2pg.migration.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

@Component
public class DataInitializer implements CommandLineRunner {
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private PasswordEncoder passwordEncoder;
    
    @Autowired
    private DataTypeMappingRuleRepository dataTypeMappingRuleRepository;
    
    @Override
    public void run(String... args) throws Exception {
        // Initialize test user
        if (!userRepository.existsByEmail("test@gmail.com")) {
            User testUser = new User();
            testUser.setEmail("test@gmail.com");
            testUser.setPassword(passwordEncoder.encode("123456"));
            testUser.setName("Test User");
            testUser.setRole("admin");
            
            userRepository.save(testUser);
            System.out.println("Test user created: test@gmail.com / 123456");
        } else {
            System.out.println("Test user already exists: test@gmail.com");
        }
        
        // Initialize default data type mapping rules
        initializeDefaultDataTypeRules();
    }
    
    private void initializeDefaultDataTypeRules() {
        List<DataTypeMappingRuleEntity> defaultRules = Arrays.asList(
            createRule("NUMBER", "NUMERIC", "Exact numeric with precision and scale", null),
            createRule("NUMBER(p)", "NUMERIC(p)", "Exact numeric with precision", null),
            createRule("NUMBER(p,s)", "NUMERIC(p,s)", "Exact numeric with precision and scale", null),
            createRule("BINARY_FLOAT", "REAL", "32-bit floating point", null),
            createRule("BINARY_DOUBLE", "DOUBLE PRECISION", "64-bit floating point", null),
            createRule("FLOAT", "DOUBLE PRECISION", "Floating point number", null),
            createRule("INTEGER", "INTEGER", "32-bit integer", null),
            createRule("SMALLINT", "SMALLINT", "16-bit integer", null),
            createRule("VARCHAR2(n)", "VARCHAR(n)", "Variable-length character string", null),
            createRule("CHAR(n)", "CHAR(n)", "Fixed-length character string", null),
            createRule("NVARCHAR2(n)", "VARCHAR(n)", "Variable-length Unicode string", null),
            createRule("NCHAR(n)", "CHAR(n)", "Fixed-length Unicode string", null),
            createRule("CLOB", "TEXT", "Large text object", null),
            createRule("NCLOB", "TEXT", "Large Unicode text object", null),
            createRule("LONG", "TEXT", "Variable-length character data (deprecated)", null),
            createRule("DATE", "TIMESTAMP", "Date and time", "Oracle DATE includes time component"),
            createRule("TIMESTAMP", "TIMESTAMP", "Timestamp without timezone", null),
            createRule("TIMESTAMP WITH TIME ZONE", "TIMESTAMPTZ", "Timestamp with timezone", null),
            createRule("TIMESTAMP WITH LOCAL TIME ZONE", "TIMESTAMPTZ", "Timestamp with local timezone", null),
            createRule("INTERVAL YEAR TO MONTH", "INTERVAL", "Year-month interval", null),
            createRule("INTERVAL DAY TO SECOND", "INTERVAL", "Day-second interval", null),
            createRule("BLOB", "BYTEA", "Binary large object", null),
            createRule("RAW(n)", "BYTEA", "Raw binary data", null),
            createRule("LONG RAW", "BYTEA", "Variable-length raw binary data (deprecated)", null),
            createRule("BFILE", "BYTEA", "External binary file", "Requires data extraction"),
            createRule("ROWID", "VARCHAR(18)", "Row identifier", null),
            createRule("UROWID", "VARCHAR(4000)", "Universal row identifier", null),
            createRule("XMLTYPE", "XML", "XML data", null),
            createRule("SDO_GEOMETRY", "GEOMETRY", "Spatial data", "Requires PostGIS extension"),
            createRule("BOOLEAN", "BOOLEAN", "Boolean value", null)
        );
        
        for (DataTypeMappingRuleEntity rule : defaultRules) {
            // Check if rule already exists (by oracle type and isCustom=false)
            if (dataTypeMappingRuleRepository.findByIsCustomFalseOrderByOracleTypeAsc().stream()
                    .noneMatch(r -> r.getOracleType().equals(rule.getOracleType()))) {
                dataTypeMappingRuleRepository.save(rule);
            }
        }
        
        System.out.println("Default data type mapping rules initialized");
    }
    
    private DataTypeMappingRuleEntity createRule(String oracleType, String postgresType, String description, String transformationHint) {
        DataTypeMappingRuleEntity rule = new DataTypeMappingRuleEntity();
        rule.setOracleType(oracleType);
        rule.setPostgresType(postgresType);
        rule.setDescription(description);
        rule.setTransformationHint(transformationHint);
        rule.setIsCustom(false);
        rule.setUser(null); // System default rules have no user
        return rule;
    }
}

