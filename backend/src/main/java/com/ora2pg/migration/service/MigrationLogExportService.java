package com.ora2pg.migration.service;

import com.ora2pg.migration.entity.MigrationLogEntity;
import com.ora2pg.migration.repository.MigrationLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class MigrationLogExportService {
    
    private final MigrationLogRepository logRepository;
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    
    /**
     * Export migration logs to CSV format
     */
    public byte[] exportToCsv(String projectId) throws IOException {
        List<MigrationLogEntity> logs = logRepository.findByProjectIdOrderByTimestampAsc(projectId);
        
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        Writer writer = new OutputStreamWriter(outputStream, StandardCharsets.UTF_8);
        
        // Write BOM for UTF-8 (helps Excel recognize encoding)
        outputStream.write(0xEF);
        outputStream.write(0xBB);
        outputStream.write(0xBF);
        
        // Write CSV header
        writer.write("Timestamp,Level,Message,Details\n");
        
        // Write log entries
        for (MigrationLogEntity log : logs) {
            writer.write(escapeCsv(log.getTimestamp().format(DATE_FORMATTER)));
            writer.write(",");
            writer.write(escapeCsv(log.getLevel()));
            writer.write(",");
            writer.write(escapeCsv(log.getMessage()));
            writer.write(",");
            writer.write(escapeCsv(log.getDetails() != null ? log.getDetails() : ""));
            writer.write("\n");
        }
        
        writer.flush();
        writer.close();
        
        return outputStream.toByteArray();
    }
    
    /**
     * Export migration logs to Excel format
     */
    public byte[] exportToExcel(String projectId) throws IOException {
        List<MigrationLogEntity> logs = logRepository.findByProjectIdOrderByTimestampAsc(projectId);
        
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Migration Logs");
            
            // Create header style
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setFontHeightInPoints((short) 12);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setBorderBottom(BorderStyle.THIN);
            headerStyle.setBorderTop(BorderStyle.THIN);
            headerStyle.setBorderLeft(BorderStyle.THIN);
            headerStyle.setBorderRight(BorderStyle.THIN);
            
            // Create data style
            CellStyle dataStyle = workbook.createCellStyle();
            dataStyle.setBorderBottom(BorderStyle.THIN);
            dataStyle.setBorderTop(BorderStyle.THIN);
            dataStyle.setBorderLeft(BorderStyle.THIN);
            dataStyle.setBorderRight(BorderStyle.THIN);
            dataStyle.setWrapText(true);
            
            // Create row for header
            Row headerRow = sheet.createRow(0);
            String[] headers = {"Timestamp", "Level", "Message", "Details"};
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }
            
            // Create data rows
            int rowNum = 1;
            for (MigrationLogEntity log : logs) {
                Row row = sheet.createRow(rowNum++);
                
                // Timestamp
                Cell timestampCell = row.createCell(0);
                timestampCell.setCellValue(log.getTimestamp().format(DATE_FORMATTER));
                timestampCell.setCellStyle(dataStyle);
                
                // Level
                Cell levelCell = row.createCell(1);
                levelCell.setCellValue(log.getLevel());
                levelCell.setCellStyle(dataStyle);
                
                // Color code level cells
                CellStyle levelStyle = workbook.createCellStyle();
                levelStyle.cloneStyleFrom(dataStyle);
                switch (log.getLevel().toLowerCase()) {
                    case "error":
                        levelStyle.setFillForegroundColor(IndexedColors.RED.getIndex());
                        levelStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
                        break;
                    case "warning":
                        levelStyle.setFillForegroundColor(IndexedColors.YELLOW.getIndex());
                        levelStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
                        break;
                    case "success":
                        levelStyle.setFillForegroundColor(IndexedColors.GREEN.getIndex());
                        levelStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
                        break;
                    case "info":
                    default:
                        levelStyle.setFillForegroundColor(IndexedColors.LIGHT_BLUE.getIndex());
                        levelStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
                        break;
                }
                levelCell.setCellStyle(levelStyle);
                
                // Message
                Cell messageCell = row.createCell(2);
                messageCell.setCellValue(log.getMessage());
                messageCell.setCellStyle(dataStyle);
                
                // Details
                Cell detailsCell = row.createCell(3);
                detailsCell.setCellValue(log.getDetails() != null ? log.getDetails() : "");
                detailsCell.setCellStyle(dataStyle);
            }
            
            // Auto-size columns
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
                // Set minimum width
                if (sheet.getColumnWidth(i) < 3000) {
                    sheet.setColumnWidth(i, 3000);
                }
            }
            
            // Write to byte array
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            workbook.write(outputStream);
            return outputStream.toByteArray();
        }
    }
    
    /**
     * Escape CSV special characters
     */
    private String escapeCsv(String value) {
        if (value == null) {
            return "";
        }
        
        // If value contains comma, quote, or newline, wrap in quotes and escape quotes
        if (value.contains(",") || value.contains("\"") || value.contains("\n") || value.contains("\r")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        
        return value;
    }
}

