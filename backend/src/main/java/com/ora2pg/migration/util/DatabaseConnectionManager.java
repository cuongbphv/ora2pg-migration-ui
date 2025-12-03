package com.ora2pg.migration.util;

import com.ora2pg.migration.model.ConnectionConfig;
import org.springframework.stereotype.Component;

import java.sql.*;
import java.util.Properties;

@Component
public class DatabaseConnectionManager {
    
    public Connection getConnection(ConnectionConfig config) throws SQLException {
        // Always return a dedicated connection for the caller to avoid sharing state
        return createConnection(config);
    }
    
    private Connection createConnection(ConnectionConfig config) throws SQLException {
        String url;
        Properties props = new Properties();
        props.setProperty("user", config.getUsername());
        if (config.getPassword() != null) {
            props.setProperty("password", config.getPassword());
        }
        
        if ("oracle".equalsIgnoreCase(config.getType())) {
            if (config.getConnectionString() != null && !config.getConnectionString().isEmpty()) {
                url = config.getConnectionString();
            } else {
                // Oracle connection URL format: jdbc:oracle:thin:@host:port:database
                url = String.format("jdbc:oracle:thin:@%s:%d:%s", 
                    config.getHost(), config.getPort(), config.getDatabase());
                config.setConnectionString(url);
            }
            return DriverManager.getConnection(url, props);
            
        } else if ("postgresql".equalsIgnoreCase(config.getType())) {
            if (config.getConnectionString() != null && !config.getConnectionString().isEmpty()) {
                url = config.getConnectionString();
            } else {
                // PostgreSQL connection URL format: jdbc:postgresql://host:port/database
                url = String.format("jdbc:postgresql://%s:%d/%s", 
                    config.getHost(), config.getPort(), config.getDatabase());
                config.setConnectionString(url);
            }
            return DriverManager.getConnection(url, props);
        } else {
            throw new SQLException("Unsupported database type: " + config.getType());
        }
    }
    
    public boolean testConnection(ConnectionConfig config) {
        try (Connection conn = createConnection(config)) {
            boolean result = conn.isValid(5);
            config.setIsConnected(result);
            return result;
        } catch (SQLException e) {
            config.setIsConnected(false);
            return false;
        }
    }
    
    public String getDatabaseVersion(ConnectionConfig config) throws SQLException {
        try (Connection conn = createConnection(config)) {
            try (Statement stmt = conn.createStatement()) {
                if ("oracle".equalsIgnoreCase(config.getType())) {
                    try (ResultSet rs = stmt.executeQuery("SELECT banner FROM v$version WHERE rownum = 1")) {
                        if (rs.next()) {
                            return rs.getString(1);
                        }
                    }
                } else if ("postgresql".equalsIgnoreCase(config.getType())) {
                    try (ResultSet rs = stmt.executeQuery("SELECT version()")) {
                        if (rs.next()) {
                            return rs.getString(1);
                        }
                    }
                }
            }
        }
        return "Unknown";
    }
    
    // Legacy close methods are no longer required because each caller manages its own connection lifecycle.
}

