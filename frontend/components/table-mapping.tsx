"use client"

import { useState, useEffect } from "react"
import type { TableMapping, ColumnMapping, Project } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination"
import {
  TableIcon,
  SearchIcon,
  FilterIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  KeyIcon,
  LinkIcon,
  ArrowRightIcon,
  EditIcon,
  SaveIcon,
  XIcon,
  RefreshIcon,
  CheckIcon,
} from "./icons"
import { cn } from "@/lib/utils"
import { oracleToPostgresTypes } from "@/lib/data-type-mappings"
import { apiService } from "@/lib/api"
import { toast } from "@/lib/toast"

interface TableMappingProps {
  projectId?: string | null
  appSettings?: { tableNameFilter?: string }
}

export function TableMappingView({ projectId, appSettings }: TableMappingProps) {
  const [project, setProject] = useState<Project | null>(null)
  const [tables, setTables] = useState<TableMapping[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [expandedTable, setExpandedTable] = useState<string | null>(null)
  const [selectedTables, setSelectedTables] = useState<string[]>([])
  const [editingTable, setEditingTable] = useState<string | null>(null)
  const [editingColumn, setEditingColumn] = useState<{ tableId: string; columnId: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [discovering, setDiscovering] = useState(false)
  const [autoMapping, setAutoMapping] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50)

  // Load project and table mappings
  useEffect(() => {
    if (projectId) {
      loadProject()
    }
  }, [projectId])

  const loadProject = async () => {
    if (!projectId) return
    try {
      setLoading(true)
      const result = await apiService.getProject(projectId)
      if (result.data) {
        const projectData = result.data as Project
        setProject(projectData)
        const mappings = (projectData.tableMappings || []) as TableMapping[]
        setTables(mappings)
        setSelectedTables(
          mappings.filter((t) => t.enabled).map((t) => t.id)
        )
      }
    } catch (error) {
      console.error("Failed to load project:", error)
    } finally {
      setLoading(false)
    }
  }

  const saveTableMappings = async (updatedTables: TableMapping[]) => {
    if (!projectId) return
    try {
      const result = await apiService.saveTableMappings(projectId, updatedTables)
      if (result.data) {
        const projectData = result.data as Project
        setProject(projectData)
        const mappings = (projectData.tableMappings || []) as TableMapping[]
        setTables(mappings)
      }
    } catch (error) {
      console.error("Failed to save table mappings:", error)
      toast.error("Failed to save table mappings", "Please try again")
    }
  }

  const handleDiscoverTables = async () => {
    if (!project || !project.sourceConnection || !project.sourceConnection.schema) {
      toast.warning("Source connection required", "Please configure the source connection first")
      return
    }

    try {
      setDiscovering(true)
      const result = await apiService.discoverTables(
        project.sourceConnection,
        project.sourceConnection.schema || "",
        appSettings?.tableNameFilter
      )
      if (result.data) {
        // Convert TableInfo to TableMapping format
        const tableInfos = result.data as any[]
        const discoveredMappings: TableMapping[] = tableInfos.map((table: any) => ({
          id: `${table.schema}.${table.tableName}`,
          sourceTable: table.tableName,
          sourceSchema: table.schema,
          targetTable: table.tableName.toLowerCase(),
          targetSchema: project.targetConnection?.schema || "public",
          enabled: true,
          status: "pending" as const,
          columnMappings: ((table.columns || []) as any[]).map((col: any) => ({
            id: `${table.tableName}.${col.columnName}`,
            sourceColumn: col.columnName,
            sourceDataType: col.dataType || "VARCHAR",
            sourceDataLength: col.dataLength || undefined,
            sourceDataPrecision: col.dataPrecision || undefined,
            sourceDataScale: col.dataScale || undefined,
            targetColumn: col.columnName.toLowerCase(),
            targetDataType: mapDataType(col.dataType || "VARCHAR", col.dataLength, col.dataPrecision, col.dataScale),
            targetDataLength: col.dataLength || undefined,
            targetDataPrecision: col.dataPrecision || undefined,
            targetDataScale: col.dataScale || undefined,
            nullable: col.nullable !== false,
            isPrimaryKey: col.isPrimaryKey || false,
            isForeignKey: col.isForeignKey || false,
          })),
        }))
        setTables(discoveredMappings)
        await saveTableMappings(discoveredMappings)
        toast.success("Tables discovered", `Found ${discoveredMappings.length} table(s)`)
      } else {
        toast.error("Failed to discover tables", result.error || "Please check your connection settings")
      }
    } catch (error) {
      console.error("Failed to discover tables:", error)
      toast.error("Failed to discover tables", "Please check your connection and try again")
    } finally {
      setDiscovering(false)
    }
  }

  const handleAutoMap = async () => {
    if (!project || !project.sourceConnection || !project.targetConnection) {
      toast.warning("Connections required", "Please configure both source and target connections first")
      return
    }

    try {
      setAutoMapping(true)
      // Get source tables from current mappings or discover them
      const sourceTables = tables.length > 0 
        ? tables.map(t => ({
            tableName: t.sourceTable,
            schema: t.sourceSchema,
            rowCount: 0,
            columns: t.columnMappings.map(c => ({
              columnName: c.sourceColumn,
              dataType: c.sourceDataType,
              nullable: c.nullable,
              isPrimaryKey: c.isPrimaryKey,
              isForeignKey: c.isForeignKey,
            })),
          }))
        : []

      if (sourceTables.length === 0) {
        toast.warning("No tables found", "Please discover tables first")
        return
      }

      const result = await apiService.autoMapTables(
        sourceTables,
        project.targetConnection.schema || "public"
      )
      if (result.data) {
        const mappings = result.data as TableMapping[]
        setTables(mappings)
        await saveTableMappings(mappings)
        toast.success("Tables auto-mapped", `Successfully mapped ${mappings.length} table(s)`)
      } else {
        toast.error("Failed to auto-map tables", result.error || "Please try again")
      }
    } catch (error) {
      console.error("Failed to auto-map tables:", error)
      toast.error("Failed to auto-map tables", "Please try again")
    } finally {
      setAutoMapping(false)
    }
  }

  const mapDataType = (oracleType: string, dataLength?: number, dataPrecision?: number, dataScale?: number): string => {
    if (!oracleType) return "TEXT"
    
    const upperType = oracleType.toUpperCase().trim()
    const baseType = upperType.includes("(") ? upperType.substring(0, upperType.indexOf("(")) : upperType
    
    // Handle types with length/precision
    if (baseType === "VARCHAR2" || baseType === "NVARCHAR2") {
      if (dataLength && dataLength > 0) {
        return `VARCHAR(${dataLength})`
      }
      if (upperType.includes("(")) {
        const params = upperType.substring(upperType.indexOf("("))
        return "VARCHAR" + params
      }
      return "TEXT" // No length specified, use TEXT
    }
    
    if (baseType === "NUMBER") {
      if (dataPrecision && dataPrecision > 0) {
        if (dataScale && dataScale > 0) {
          return `NUMERIC(${dataPrecision},${dataScale})`
        }
        return `NUMERIC(${dataPrecision})`
      }
      if (upperType.includes("(")) {
        const params = upperType.substring(upperType.indexOf("("))
        return "NUMERIC" + params
      }
      return "NUMERIC"
    }
    
    if (baseType === "CHAR" || baseType === "NCHAR") {
      if (dataLength && dataLength > 0) {
        return `CHAR(${dataLength})`
      }
      if (upperType.includes("(")) {
        const params = upperType.substring(upperType.indexOf("("))
        return "CHAR" + params
      }
      return "CHAR(1)"
    }
    
    if (baseType.startsWith("TIMESTAMP")) {
      if (upperType.includes("(")) {
        const params = upperType.substring(upperType.indexOf("("))
        return "TIMESTAMP" + params
      }
      return "TIMESTAMP"
    }
    
    // Find mapping for other types
    const mapping = oracleToPostgresTypes.find(
      (m) =>
        m.oracleType.toUpperCase() === upperType ||
        baseType === m.oracleType.split("(")[0].toUpperCase()
    )
    return mapping?.postgresType || "TEXT"
  }
  
  // Parse data type to extract base type and parameters
  const parseDataType = (dataType: string): { baseType: string; length?: number; precision?: number; scale?: number } => {
    if (!dataType) return { baseType: "TEXT" }
    
    const match = dataType.match(/^(\w+)(?:\((\d+)(?:,(\d+))?\))?$/)
    if (match) {
      const baseType = match[1]
      const length = match[2] ? parseInt(match[2]) : undefined
      const scale = match[3] ? parseInt(match[3]) : undefined
      return { baseType, length, precision: length, scale }
    }
    return { baseType: dataType }
  }
  
  // Format data type string from components
  const formatDataType = (baseType: string, length?: number, precision?: number, scale?: number): string => {
    if (baseType === "VARCHAR" || baseType === "CHAR") {
      if (length && length > 0) {
        return `${baseType}(${length})`
      }
      return baseType === "VARCHAR" ? "TEXT" : "CHAR(1)"
    }
    if (baseType === "NUMERIC") {
      if (precision && precision > 0) {
        if (scale && scale > 0) {
          return `NUMERIC(${precision},${scale})`
        }
        return `NUMERIC(${precision})`
      }
      return "NUMERIC"
    }
    if (baseType === "TIMESTAMP" && length) {
      return `TIMESTAMP(${length})`
    }
    return baseType
  }
  
  // Format source data type with length/precision/scale for display
  const formatSourceDataType = (dataType: string, length?: number, precision?: number, scale?: number): string => {
    if (!dataType) return ""
    
    const upperType = dataType.toUpperCase().trim()
    const baseType = upperType.includes("(") ? upperType.substring(0, upperType.indexOf("(")) : upperType
    
    // If dataType already has length/precision, return as is
    if (upperType.includes("(")) {
      return dataType
    }
    
    // Otherwise, format with provided length/precision/scale
    if (baseType === "VARCHAR2" || baseType === "NVARCHAR2" || baseType === "VARCHAR") {
      if (length && length > 0) {
        return `${baseType}(${length})`
      }
      return baseType
    }
    
    if (baseType === "CHAR" || baseType === "NCHAR") {
      if (length && length > 0) {
        return `${baseType}(${length})`
      }
      return baseType
    }
    
    if (baseType === "NUMBER" || baseType === "NUMERIC") {
      if (precision && precision > 0) {
        if (scale && scale > 0) {
          return `${baseType}(${precision},${scale})`
        }
        return `${baseType}(${precision})`
      }
      return baseType
    }
    
    if (baseType.startsWith("TIMESTAMP") || baseType === "DATE") {
      // For TIMESTAMP, precision is usually in dataScale, but can also be in dataLength
      // Oracle TIMESTAMP(6) has precision 6
      if (scale && scale > 0) {
        return `TIMESTAMP(${scale})`
      } else if (length && length > 0) {
        return `TIMESTAMP(${length})`
      } else if (precision && precision > 0) {
        return `TIMESTAMP(${precision})`
      }
      return baseType
    }
    
    return dataType
  }

  const toggleTable = (id: string) => {
    const updated = tables.map((t) =>
      t.id === id ? { ...t, enabled: !t.enabled } : t
    )
    setTables(updated)
    setSelectedTables((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]))
    saveTableMappings(updated)
  }

  const handleSelectAll = () => {
    const allSelected = tables.every((t) => t.enabled)
    const updated = tables.map((t) => ({ ...t, enabled: !allSelected }))
    setTables(updated)
    setSelectedTables(updated.map((t) => t.id))
    saveTableMappings(updated)
    toast.info(allSelected ? "All tables disabled" : "All tables enabled")
  }

  const allTablesSelected = tables.length > 0 && tables.every((t) => t.enabled)
  const someTablesSelected = tables.some((t) => t.enabled) && !allTablesSelected

  const toggleExpand = (id: string) => {
    setExpandedTable((prev) => (prev === id ? null : id))
  }

  const updateTargetTable = async (tableId: string, newTargetTable: string, newTargetSchema: string) => {
    const updated = tables.map((t) =>
      t.id === tableId ? { ...t, targetTable: newTargetTable, targetSchema: newTargetSchema, status: "mapped" as const } : t,
    )
    setTables(updated)
    setEditingTable(null)
    await saveTableMappings(updated)
  }

  const updateColumnMapping = async (tableId: string, columnId: string, updates: Partial<ColumnMapping>) => {
    const updated = tables.map((t) =>
      t.id === tableId
        ? {
            ...t,
            status: "mapped" as const,
            columnMappings: t.columnMappings.map((c) => (c.id === columnId ? { ...c, ...updates } : c)),
          }
        : t,
    )
    setTables(updated)
    setEditingColumn(null)
    await saveTableMappings(updated)
  }

  // Get available PostgreSQL types
  const postgresTypes = [...new Set(oracleToPostgresTypes.map((m) => m.postgresType))]

  // Enhanced search - search by table name, schema, or column name
  const filteredTables = tables.filter((table) => {
    if (!searchTerm) return true
    
    const searchLower = searchTerm.toLowerCase()
    
    // Search in source table name and schema
    if (
      table.sourceTable.toLowerCase().includes(searchLower) ||
      table.sourceSchema.toLowerCase().includes(searchLower) ||
      `${table.sourceSchema}.${table.sourceTable}`.toLowerCase().includes(searchLower)
    ) {
      return true
    }
    
    // Search in target table name and schema
    if (
      table.targetTable.toLowerCase().includes(searchLower) ||
      table.targetSchema.toLowerCase().includes(searchLower) ||
      `${table.targetSchema}.${table.targetTable}`.toLowerCase().includes(searchLower)
    ) {
      return true
    }
    
    // Search in column names
    if (
      table.columnMappings.some(
        (col) =>
          col.sourceColumn.toLowerCase().includes(searchLower) ||
          col.targetColumn.toLowerCase().includes(searchLower)
      )
    ) {
      return true
    }
    
    return false
  })

  // Pagination calculations
  const totalPages = Math.ceil(filteredTables.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedTables = filteredTables.slice(startIndex, endIndex)

  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground">No Project Selected</h2>
          <p className="text-muted-foreground mt-2">Select a project from the sidebar to configure table mappings</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-muted-foreground">Loading table mappings...</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Table Mapping</h1>
          <p className="text-muted-foreground">Configure source to target table and column mappings</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDiscoverTables}
            disabled={discovering || !project?.sourceConnection}
          >
            {discovering ? (
              <>
                <RefreshIcon className="w-4 h-4 mr-2 animate-spin" />
                Discovering...
              </>
            ) : (
              <>
                <RefreshIcon className="w-4 h-4 mr-2" />
                Discover Tables
              </>
            )}
          </Button>
          <Button
            size="sm"
            onClick={handleAutoMap}
            disabled={autoMapping || tables.length === 0}
          >
            {autoMapping ? (
              <>
                <RefreshIcon className="w-4 h-4 mr-2 animate-spin" />
                Auto-Mapping...
              </>
            ) : (
              "Auto-Map All"
            )}
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by table name, schema, or column name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-input border-border"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Items per page:</span>
          <Select
            value={itemsPerPage.toString()}
            onValueChange={(value) => {
              setItemsPerPage(Number(value))
              setCurrentPage(1)
            }}
          >
            <SelectTrigger className="w-20 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">
            {selectedTables.length} of {tables.length} tables selected
          </span>
          <span className="text-muted-foreground">•</span>
          <span className="text-success">{tables.filter((t) => t.status === "migrated").length} migrated</span>
          <span className="text-muted-foreground">•</span>
          <span className="text-primary">{tables.filter((t) => t.status === "mapped").length} mapped</span>
          <span className="text-muted-foreground">•</span>
          <span className="text-warning">{tables.filter((t) => t.status === "pending").length} pending</span>
        </div>
        {filteredTables.length > 0 && (
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredTables.length)} of {filteredTables.length} tables
            {searchTerm && ` (filtered from ${tables.length} total)`}
          </div>
        )}
      </div>

      {/* Table List */}
      {tables.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-12 text-center">
            <TableIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Tables Found</h3>
            <p className="text-muted-foreground mb-4">
              {project?.sourceConnection
                ? "Click 'Discover Tables' to find tables in your source database"
                : "Please configure the source connection first"}
            </p>
            {project?.sourceConnection && (
              <Button onClick={handleDiscoverTables} disabled={discovering}>
                <RefreshIcon className="w-4 h-4 mr-2" />
                Discover Tables
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card border-border">
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {/* Header */}
              <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-muted/30 text-sm font-medium text-muted-foreground items-center">
                <div className="col-span-1">
                  <button
                    onClick={handleSelectAll}
                    className="flex items-center justify-center"
                    aria-label="Select all tables"
                    title={allTablesSelected ? "Deselect all" : "Select all"}
                  >
                    <div className={cn(
                      "size-4 rounded border flex items-center justify-center transition-colors",
                      allTablesSelected 
                        ? "bg-primary border-primary text-primary-foreground"
                        : someTablesSelected
                        ? "bg-primary/50 border-primary text-primary-foreground"
                        : "border-input bg-background"
                    )}>
                      {allTablesSelected && <CheckIcon className="size-3" />}
                      {someTablesSelected && !allTablesSelected && (
                        <div className="w-2 h-0.5 bg-primary-foreground" />
                      )}
                    </div>
                  </button>
                </div>
                <div className="col-span-4">Source Table</div>
                <div className="col-span-1 text-center">→</div>
                <div className="col-span-4">Target Table</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>

              {/* Tables */}
              {paginatedTables.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <p className="text-muted-foreground">
                    {searchTerm ? "No tables found matching your search" : "No tables to display"}
                  </p>
                </div>
              ) : (
                paginatedTables.map((table) => (
                <div key={table.id} className="border-b border-border last:border-b-0">
                  {/* Table Row */}
                  <div
                    className={cn(
                      "grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-muted/20 transition-colors",
                      expandedTable === table.id && "bg-muted/30",
                    )}
                  >
                    <div className="col-span-1 flex items-center gap-2">
                      <Checkbox
                        checked={table.enabled || false}
                        onCheckedChange={() => toggleTable(table.id)}
                      />
                      <button onClick={() => toggleExpand(table.id)}>
                        {expandedTable === table.id ? (
                          <ChevronDownIcon className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRightIcon className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                    <div className="col-span-4">
                      <div className="flex items-center gap-2">
                        <TableIcon className="w-4 h-4 text-oracle" />
                        <span className="font-mono text-sm">
                          {table.sourceSchema}.{table.sourceTable}
                        </span>
                      </div>
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <ArrowRightIcon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="col-span-4">
                      {editingTable === table.id ? (
                        <EditableTableName
                          schema={table.targetSchema}
                          table={table.targetTable}
                          onSave={(schema, tableName) => updateTargetTable(table.id, tableName, schema)}
                          onCancel={() => setEditingTable(null)}
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <TableIcon className="w-4 h-4 text-postgres" />
                          <span className="font-mono text-sm">
                            {table.targetSchema}.{table.targetTable}
                          </span>
                          <button
                            onClick={() => setEditingTable(table.id)}
                            className="p-1 hover:bg-muted rounded opacity-50 hover:opacity-100"
                          >
                            <EditIcon className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="col-span-2 flex justify-end items-center gap-2">
                      <span
                        className={cn(
                          "px-2 py-1 text-xs rounded-full font-medium",
                          table.status === "migrated" && "bg-success/20 text-success",
                          table.status === "mapped" && "bg-primary/20 text-primary",
                          table.status === "pending" && "bg-warning/20 text-warning",
                          table.status === "error" && "bg-destructive/20 text-destructive",
                        )}
                      >
                        {table.status}
                      </span>
                    </div>
                  </div>

                  {expandedTable === table.id && table.columnMappings.length > 0 && (
                    <div className="bg-muted/10 border-t border-border">
                      <div className="px-8 py-2">
                        <div className="grid grid-cols-12 gap-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          <div className="col-span-3">Source Column</div>
                          <div className="col-span-2">Type</div>
                          <div className="col-span-1"></div>
                          <div className="col-span-3">Target Column</div>
                          <div className="col-span-2">Type</div>
                          <div className="col-span-1">Actions</div>
                        </div>
                        {table.columnMappings.map((col) => (
                          <div
                            key={col.id}
                            className="grid grid-cols-12 gap-4 py-2 items-center text-sm border-t border-border/50"
                          >
                            <div className="col-span-3 font-mono text-foreground flex items-center gap-2">
                              {col.isPrimaryKey && <KeyIcon className="w-3 h-3 text-warning" />}
                              {col.isForeignKey && <LinkIcon className="w-3 h-3 text-primary" />}
                              {col.sourceColumn}
                            </div>
                            <div className="col-span-2 font-mono text-xs text-oracle">
                              {formatSourceDataType(
                                col.sourceDataType,
                                col.sourceDataLength,
                                col.sourceDataPrecision,
                                col.sourceDataScale
                              )}
                            </div>
                            <div className="col-span-1 flex justify-center">
                              <ArrowRightIcon className="w-3 h-3 text-muted-foreground" />
                            </div>
                            {/* Editable target column */}
                            {editingColumn?.tableId === table.id && editingColumn?.columnId === col.id ? (
                              <>
                                <div className="col-span-3">
                                  <Input
                                    defaultValue={col.targetColumn}
                                    className="h-7 text-xs font-mono bg-input"
                                    id={`col-name-${col.id}`}
                                  />
                                </div>
                                <div className="col-span-2 flex gap-1 items-center">
                                  <Select
                                    defaultValue={parseDataType(col.targetDataType).baseType}
                                    onValueChange={(baseType) => {
                                      const nameInput = document.getElementById(`col-name-${col.id}`) as HTMLInputElement
                                      const lengthInput = document.getElementById(`col-length-${col.id}`) as HTMLInputElement
                                      const precisionInput = document.getElementById(`col-precision-${col.id}`) as HTMLInputElement
                                      const scaleInput = document.getElementById(`col-scale-${col.id}`) as HTMLInputElement
                                      
                                      const length = lengthInput ? parseInt(lengthInput.value) || undefined : col.targetDataLength
                                      const precision = precisionInput ? parseInt(precisionInput.value) || undefined : col.targetDataPrecision
                                      const scale = scaleInput ? parseInt(scaleInput.value) || undefined : col.targetDataScale
                                      
                                      const newDataType = formatDataType(baseType, length, precision, scale)
                                      
                                      updateColumnMapping(table.id, col.id, {
                                        targetColumn: nameInput?.value || col.targetColumn,
                                        targetDataType: newDataType,
                                        targetDataLength: length,
                                        targetDataPrecision: precision,
                                        targetDataScale: scale,
                                      })
                                    }}
                                  >
                                    <SelectTrigger className="h-7 text-xs font-mono bg-input flex-1">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {[...new Set(postgresTypes.map(t => parseDataType(t).baseType))].map((baseType) => (
                                        <SelectItem key={baseType} value={baseType} className="text-xs font-mono">
                                          {baseType}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  {(parseDataType(col.targetDataType).baseType === "VARCHAR" || 
                                    parseDataType(col.targetDataType).baseType === "CHAR") && (
                                    <Input
                                      id={`col-length-${col.id}`}
                                      type="number"
                                      placeholder="L"
                                      defaultValue={col.targetDataLength || parseDataType(col.targetDataType).length}
                                      className="h-7 w-16 text-xs font-mono bg-input"
                                      onChange={(e) => {
                                        const nameInput = document.getElementById(`col-name-${col.id}`) as HTMLInputElement
                                        const baseType = parseDataType(col.targetDataType).baseType
                                        const length = parseInt(e.target.value) || undefined
                                        const newDataType = formatDataType(baseType, length)
                                        updateColumnMapping(table.id, col.id, {
                                          targetColumn: nameInput?.value || col.targetColumn,
                                          targetDataType: newDataType,
                                          targetDataLength: length,
                                        })
                                      }}
                                    />
                                  )}
                                  {parseDataType(col.targetDataType).baseType === "NUMERIC" && (
                                    <>
                                      <Input
                                        id={`col-precision-${col.id}`}
                                        type="number"
                                        placeholder="P"
                                        defaultValue={col.targetDataPrecision || parseDataType(col.targetDataType).precision}
                                        className="h-7 w-14 text-xs font-mono bg-input"
                                        onChange={(e) => {
                                          const nameInput = document.getElementById(`col-name-${col.id}`) as HTMLInputElement
                                          const precision = parseInt(e.target.value) || undefined
                                          const scale = col.targetDataScale || parseDataType(col.targetDataType).scale
                                          const newDataType = formatDataType("NUMERIC", precision, precision, scale)
                                          updateColumnMapping(table.id, col.id, {
                                            targetColumn: nameInput?.value || col.targetColumn,
                                            targetDataType: newDataType,
                                            targetDataPrecision: precision,
                                            targetDataScale: scale,
                                          })
                                        }}
                                      />
                                      <Input
                                        id={`col-scale-${col.id}`}
                                        type="number"
                                        placeholder="S"
                                        defaultValue={col.targetDataScale || parseDataType(col.targetDataType).scale}
                                        className="h-7 w-14 text-xs font-mono bg-input"
                                        onChange={(e) => {
                                          const nameInput = document.getElementById(`col-name-${col.id}`) as HTMLInputElement
                                          const precision = col.targetDataPrecision || parseDataType(col.targetDataType).precision
                                          const scale = parseInt(e.target.value) || undefined
                                          const newDataType = formatDataType("NUMERIC", precision, precision, scale)
                                          updateColumnMapping(table.id, col.id, {
                                            targetColumn: nameInput?.value || col.targetColumn,
                                            targetDataType: newDataType,
                                            targetDataPrecision: precision,
                                            targetDataScale: scale,
                                          })
                                        }}
                                      />
                                    </>
                                  )}
                                </div>
                                <div className="col-span-1 flex gap-1">
                                  <button
                                    onClick={() => {
                                      const nameInput = document.getElementById(`col-name-${col.id}`) as HTMLInputElement
                                      updateColumnMapping(table.id, col.id, {
                                        targetColumn: nameInput?.value || col.targetColumn,
                                      })
                                    }}
                                    className="p-1 hover:bg-success/20 text-success rounded"
                                  >
                                    <SaveIcon className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => setEditingColumn(null)}
                                    className="p-1 hover:bg-destructive/20 text-destructive rounded"
                                  >
                                    <XIcon className="w-3 h-3" />
                                  </button>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="col-span-3 font-mono text-foreground">{col.targetColumn}</div>
                                <div className="col-span-2 font-mono text-xs text-postgres">{col.targetDataType}</div>
                                <div className="col-span-1 flex items-center gap-1">
                                  {!col.nullable && (
                                    <span className="px-1 py-0.5 text-[10px] bg-destructive/20 text-destructive rounded">
                                      NN
                                    </span>
                                  )}
                                  <button
                                    onClick={() => setEditingColumn({ tableId: table.id, columnId: col.id })}
                                    className="p-1 hover:bg-muted rounded opacity-50 hover:opacity-100"
                                  >
                                    <EditIcon className="w-3 h-3" />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Table Options: Filter, Drop, Truncate */}
                  {expandedTable === table.id && (
                    <div className="bg-muted/10 border-t border-border px-8 py-4 space-y-3">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                        Migration Options
                      </div>
                      
                      {/* Filter Condition */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-foreground">Filter Condition (WHERE clause)</label>
                        <Input
                          placeholder="e.g., status = 'ACTIVE' AND created_date > '2024-01-01'"
                          value={table.filterCondition || ""}
                          onChange={(e) => {
                            const updated = tables.map((t) =>
                              t.id === table.id ? { ...t, filterCondition: e.target.value } : t
                            )
                            setTables(updated)
                            saveTableMappings(updated)
                          }}
                          className="h-8 text-xs font-mono bg-input"
                        />
                        <p className="text-xs text-muted-foreground">
                          Optional: Add WHERE clause to filter source data. Example: status = 'ACTIVE'
                        </p>
                      </div>
                      
                      {/* Drop/Truncate Options */}
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`drop-${table.id}`}
                            checked={table.dropBeforeInsert || false}
                            onChange={(e) => {
                              const updated = tables.map((t) =>
                                t.id === table.id ? { ...t, dropBeforeInsert: e.target.checked, truncateBeforeInsert: e.target.checked ? false : t.truncateBeforeInsert } : t
                              )
                              setTables(updated)
                              saveTableMappings(updated)
                            }}
                            className="w-4 h-4 rounded border-input"
                          />
                          <label htmlFor={`drop-${table.id}`} className="text-xs font-medium cursor-pointer">
                            Drop table before migration
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`truncate-${table.id}`}
                            checked={table.truncateBeforeInsert || false}
                            onChange={(e) => {
                              const updated = tables.map((t) =>
                                t.id === table.id ? { ...t, truncateBeforeInsert: e.target.checked, dropBeforeInsert: e.target.checked ? false : t.dropBeforeInsert } : t
                              )
                              setTables(updated)
                              saveTableMappings(updated)
                            }}
                            className="w-4 h-4 rounded border-input"
                          />
                          <label htmlFor={`truncate-${table.id}`} className="text-xs font-medium cursor-pointer">
                            Truncate table before insert
                          </label>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Note: Drop removes the table completely. Truncate clears data but keeps the table structure.
                      </p>
                    </div>
                  )}
                  
                  {/* Empty columns state */}
                  {expandedTable === table.id && table.columnMappings.length === 0 && (
                    <div className="bg-muted/10 border-t border-border px-8 py-6 text-center">
                      <p className="text-muted-foreground text-sm">No column mappings configured yet.</p>
                    </div>
                  )}
                </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {filteredTables.length > itemsPerPage && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={(e) => {
                    e.preventDefault()
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  href="#"
                />
              </PaginationItem>
              
              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }
                
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={(e) => {
                        e.preventDefault()
                        setCurrentPage(pageNum)
                      }}
                      isActive={currentPage === pageNum}
                      className="cursor-pointer"
                      href="#"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                )
              })}
              
              {totalPages > 5 && currentPage < totalPages - 2 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
              
              <PaginationItem>
                <PaginationNext
                  onClick={(e) => {
                    e.preventDefault()
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  href="#"
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  )
}

function EditableTableName({
  schema,
  table,
  onSave,
  onCancel,
}: {
  schema: string
  table: string
  onSave: (schema: string, table: string) => void
  onCancel: () => void
}) {
  const [newSchema, setNewSchema] = useState(schema)
  const [newTable, setNewTable] = useState(table)

  return (
    <div className="flex items-center gap-1">
      <TableIcon className="w-4 h-4 text-postgres shrink-0" />
      <Input
        value={newSchema}
        onChange={(e) => setNewSchema(e.target.value)}
        className="h-7 w-20 text-xs font-mono bg-input"
      />
      <span className="text-muted-foreground">.</span>
      <Input
        value={newTable}
        onChange={(e) => setNewTable(e.target.value)}
        className="h-7 w-28 text-xs font-mono bg-input"
      />
      <button onClick={() => onSave(newSchema, newTable)} className="p-1 hover:bg-success/20 text-success rounded">
        <SaveIcon className="w-3 h-3" />
      </button>
      <button onClick={onCancel} className="p-1 hover:bg-destructive/20 text-destructive rounded">
        <XIcon className="w-3 h-3" />
      </button>
    </div>
  )
}
