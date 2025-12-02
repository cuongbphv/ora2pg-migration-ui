package com.ora2pg.migration.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ConnectionConfig {
    @NotBlank(message = "Database type is required")
    private String type; // "oracle" or "postgresql"
    
    @NotBlank(message = "Host is required")
    private String host;
    
    @NotNull(message = "Port is required")
    private Integer port;
    
    @NotBlank(message = "Database name is required")
    private String database;
    
    private String schema;
    
    @NotBlank(message = "Username is required")
    private String username;
    
    private String password;
    
    private String connectionString;
    
    private Boolean isConnected;
}

