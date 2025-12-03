package com.ora2pg.migration.service;

import com.ora2pg.migration.entity.SettingEntity;
import com.ora2pg.migration.model.AppSettings;
import com.ora2pg.migration.repository.SettingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class SettingsService {
    
    @Autowired
    private SettingRepository settingRepository;
    
    public AppSettings getSettings() {
        AppSettings settings = new AppSettings();
        Map<String, SettingEntity> settingsMap = loadSettingsMap();
        
        // Performance settings
        settings.setParallelJobs(getIntValue(settingsMap, "parallelJobs", 4));
        settings.setBatchSize(getIntValue(settingsMap, "batchSize", 1000));
        settings.setCommitInterval(getIntValue(settingsMap, "commitInterval", 10000));
        
        // SMTP settings
        settings.setSmtpEnabled(getBoolValue(settingsMap, "smtpEnabled", false));
        settings.setSmtpHost(getStringValue(settingsMap, "smtpHost", ""));
        settings.setSmtpPort(getIntValue(settingsMap, "smtpPort", 587));
        settings.setSmtpUser(getStringValue(settingsMap, "smtpUser", ""));
        settings.setSmtpPassword(getStringValue(settingsMap, "smtpPassword", ""));
        settings.setSmtpFromEmail(getStringValue(settingsMap, "smtpFromEmail", ""));
        settings.setNotifyOnComplete(getBoolValue(settingsMap, "notifyOnComplete", true));
        settings.setNotifyOnError(getBoolValue(settingsMap, "notifyOnError", true));
        
        // Logging settings
        settings.setLogLevel(getStringValue(settingsMap, "logLevel", "info"));
        settings.setLogRetentionDays(getIntValue(settingsMap, "logRetentionDays", 30));
        settings.setLogToFile(getBoolValue(settingsMap, "logToFile", false));
        settings.setLogFilePath(getStringValue(settingsMap, "logFilePath", "/var/log/ora2pg"));
        
        // Migration settings
        settings.setTruncateTarget(getBoolValue(settingsMap, "truncateTarget", false));
        settings.setDisableConstraints(getBoolValue(settingsMap, "disableConstraints", false));
        settings.setPreserveSequences(getBoolValue(settingsMap, "preserveSequences", true));
        settings.setSkipErrors(getBoolValue(settingsMap, "skipErrors", false));
        settings.setMaxErrors(getIntValue(settingsMap, "maxErrors", 100));
        settings.setAutoCommit(getBoolValue(settingsMap, "autoCommit", false));
        
        // Table Discovery settings
        settings.setTableNameFilter(getStringValue(settingsMap, "tableNameFilter", ""));
        
        return settings;
    }
    
    public AppSettings updateSettings(AppSettings settings) {
        // Performance
        saveSetting("parallelJobs", String.valueOf(settings.getParallelJobs()), "performance", "number", "Number of parallel jobs");
        saveSetting("batchSize", String.valueOf(settings.getBatchSize()), "performance", "number", "Batch size for migration");
        saveSetting("commitInterval", String.valueOf(settings.getCommitInterval()), "performance", "number", "Commit interval");
        
        // SMTP
        saveSetting("smtpEnabled", String.valueOf(settings.getSmtpEnabled()), "smtp", "boolean", "Enable SMTP");
        saveSetting("smtpHost", settings.getSmtpHost(), "smtp", "string", "SMTP host");
        saveSetting("smtpPort", String.valueOf(settings.getSmtpPort()), "smtp", "number", "SMTP port");
        saveSetting("smtpUser", settings.getSmtpUser(), "smtp", "string", "SMTP username");
        saveSetting("smtpPassword", settings.getSmtpPassword(), "smtp", "string", "SMTP password");
        saveSetting("smtpFromEmail", settings.getSmtpFromEmail(), "smtp", "string", "SMTP from email");
        saveSetting("notifyOnComplete", String.valueOf(settings.getNotifyOnComplete()), "smtp", "boolean", "Notify on completion");
        saveSetting("notifyOnError", String.valueOf(settings.getNotifyOnError()), "smtp", "boolean", "Notify on error");
        
        // Logging
        saveSetting("logLevel", settings.getLogLevel(), "logging", "string", "Log level");
        saveSetting("logRetentionDays", String.valueOf(settings.getLogRetentionDays()), "logging", "number", "Log retention days");
        saveSetting("logToFile", String.valueOf(settings.getLogToFile()), "logging", "boolean", "Log to file");
        saveSetting("logFilePath", settings.getLogFilePath(), "logging", "string", "Log file path");
        
        // Migration
        saveSetting("truncateTarget", String.valueOf(settings.getTruncateTarget()), "migration", "boolean", "Truncate target tables");
        saveSetting("disableConstraints", String.valueOf(settings.getDisableConstraints()), "migration", "boolean", "Disable constraints");
        saveSetting("preserveSequences", String.valueOf(settings.getPreserveSequences()), "migration", "boolean", "Preserve sequences");
        saveSetting("skipErrors", String.valueOf(settings.getSkipErrors()), "migration", "boolean", "Skip errors");
        saveSetting("maxErrors", String.valueOf(settings.getMaxErrors()), "migration", "number", "Max errors");
        saveSetting("autoCommit", String.valueOf(settings.getAutoCommit()), "migration", "boolean", "Auto commit mode");
        
        // Table Discovery
        saveSetting("tableNameFilter", settings.getTableNameFilter() != null ? settings.getTableNameFilter() : "", "discovery", "string", "Table name filter pattern (SQL LIKE, e.g., TRADE_%)");
        
        return settings;
    }
    
    private Map<String, SettingEntity> loadSettingsMap() {
        Map<String, SettingEntity> map = new HashMap<>();
        List<SettingEntity> allSettings = settingRepository.findAll();
        for (SettingEntity setting : allSettings) {
            map.put(setting.getParamKey() + ":" + setting.getParamTab(), setting);
        }
        return map;
    }
    
    private void saveSetting(String key, String value, String tab, String type, String description) {
        SettingEntity setting = settingRepository.findByParamKeyAndParamTab(key, tab)
            .orElse(new SettingEntity());
        setting.setParamKey(key);
        setting.setParamValue(value);
        setting.setParamTab(tab);
        setting.setParamType(type);
        setting.setDescription(description);
        settingRepository.save(setting);
    }
    
    private String getStringValue(Map<String, SettingEntity> map, String key, String defaultValue) {
        for (String mapKey : map.keySet()) {
            if (mapKey.startsWith(key + ":")) {
                SettingEntity setting = map.get(mapKey);
                return setting != null && setting.getParamValue() != null ? setting.getParamValue() : defaultValue;
            }
        }
        return defaultValue;
    }
    
    private Integer getIntValue(Map<String, SettingEntity> map, String key, Integer defaultValue) {
        String value = getStringValue(map, key, String.valueOf(defaultValue));
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }
    
    private Boolean getBoolValue(Map<String, SettingEntity> map, String key, Boolean defaultValue) {
        String value = getStringValue(map, key, String.valueOf(defaultValue));
        return Boolean.parseBoolean(value);
    }
}

