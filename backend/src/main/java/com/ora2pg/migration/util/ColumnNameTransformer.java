package com.ora2pg.migration.util;

import java.util.Arrays;
import java.util.stream.Collectors;

/**
 * Utility class for transforming column names based on different naming strategies.
 * Handles conversion from Oracle's typical UPPERCASE naming to various PostgreSQL conventions.
 */
public class ColumnNameTransformer {
    
    /**
     * Transforms a column name according to the specified strategy.
     * 
     * @param columnName The original column name (typically UPPERCASE from Oracle)
     * @param strategy The naming strategy to apply
     * @return The transformed column name
     */
    public static String transform(String columnName, String strategy) {
        if (columnName == null || columnName.isEmpty()) {
            return columnName;
        }
        
        if (strategy == null || strategy.isEmpty()) {
            strategy = "lowercase"; // Default strategy
        }
        
        return switch (strategy.toLowerCase()) {
            case "lowercase" -> columnName.toLowerCase();
            case "uppercase" -> columnName.toUpperCase();
            case "original" -> columnName; // Keep as-is
            case "camelcase" -> toCamelCase(columnName);
            case "snake_case" -> toSnakeCase(columnName);
            case "pascalcase" -> toPascalCase(columnName);
            default -> columnName.toLowerCase(); // Fallback to lowercase
        };
    }
    
    /**
     * Converts a column name to camelCase.
     * Example: "USER_ID" -> "userId", "FIRST_NAME" -> "firstName"
     */
    private static String toCamelCase(String columnName) {
        String normalized = normalizeToWords(columnName);
        if (normalized.isEmpty()) {
            return columnName.toLowerCase();
        }
        
        String[] words = normalized.split("_");
        if (words.length == 0) {
            return columnName.toLowerCase();
        }
        
        StringBuilder result = new StringBuilder(words[0].toLowerCase());
        for (int i = 1; i < words.length; i++) {
            if (!words[i].isEmpty()) {
                String word = words[i].toLowerCase();
                result.append(Character.toUpperCase(word.charAt(0)));
                if (word.length() > 1) {
                    result.append(word.substring(1));
                }
            }
        }
        return result.toString();
    }
    
    /**
     * Converts a column name to snake_case.
     * Example: "USER_ID" -> "user_id", "FirstName" -> "first_name"
     */
    private static String toSnakeCase(String columnName) {
        String normalized = normalizeToWords(columnName);
        if (normalized.isEmpty()) {
            return columnName.toLowerCase();
        }
        
        // If already contains underscores, just lowercase
        if (normalized.contains("_")) {
            return normalized.toLowerCase();
        }
        
        // Convert camelCase/PascalCase to snake_case
        StringBuilder result = new StringBuilder();
        for (int i = 0; i < normalized.length(); i++) {
            char c = normalized.charAt(i);
            if (Character.isUpperCase(c) && i > 0) {
                result.append('_');
            }
            result.append(Character.toLowerCase(c));
        }
        return result.toString();
    }
    
    /**
     * Converts a column name to PascalCase.
     * Example: "USER_ID" -> "UserId", "first_name" -> "FirstName"
     */
    private static String toPascalCase(String columnName) {
        String normalized = normalizeToWords(columnName);
        if (normalized.isEmpty()) {
            return capitalizeFirst(columnName);
        }
        
        String[] words = normalized.split("_");
        return Arrays.stream(words)
                .filter(word -> !word.isEmpty())
                .map(word -> {
                    String lower = word.toLowerCase();
                    return Character.toUpperCase(lower.charAt(0)) + 
                           (lower.length() > 1 ? lower.substring(1) : "");
                })
                .collect(Collectors.joining());
    }
    
    /**
     * Normalizes a column name to a consistent format with underscores.
     * Handles various input formats: UPPERCASE, lowercase, camelCase, PascalCase, etc.
     */
    private static String normalizeToWords(String columnName) {
        if (columnName == null || columnName.isEmpty()) {
            return "";
        }
        
        // If already contains underscores, preserve them
        if (columnName.contains("_")) {
            return columnName.toUpperCase().replaceAll("\\s+", "_");
        }
        
        // Convert camelCase/PascalCase to underscore-separated
        StringBuilder result = new StringBuilder();
        for (int i = 0; i < columnName.length(); i++) {
            char c = columnName.charAt(i);
            if (Character.isUpperCase(c) && i > 0 && 
                Character.isLowerCase(columnName.charAt(i - 1))) {
                result.append('_');
            }
            result.append(Character.toUpperCase(c));
        }
        return result.toString();
    }
    
    /**
     * Capitalizes the first letter of a string.
     */
    private static String capitalizeFirst(String str) {
        if (str == null || str.isEmpty()) {
            return str;
        }
        return Character.toUpperCase(str.charAt(0)) + 
               (str.length() > 1 ? str.substring(1).toLowerCase() : "");
    }
}

