export interface Project {
  id: string
  name: string
  description?: string
  createdAt: Date
  updatedAt: Date
  sourceConnection?: ConnectionConfig
  targetConnection?: ConnectionConfig
  tableMappings: TableMapping[]
  status: "draft" | "configured" | "running" | "completed" | "error"
}

export interface ConnectionConfig {
  type: "oracle" | "postgresql"
  host: string
  port: number
  database: string
  schema?: string
  username: string
  password?: string
  connectionString?: string
  isConnected?: boolean
}

export interface TableMapping {
  id: string
  sourceTable: string
  sourceSchema: string
  targetTable: string
  targetSchema: string
  enabled: boolean
  columnMappings: ColumnMapping[]
  status: "pending" | "mapped" | "migrated" | "error"
  filterCondition?: string
  dropBeforeInsert?: boolean
  truncateBeforeInsert?: boolean
}

export interface ColumnMapping {
  id: string
  sourceColumn: string
  sourceDataType: string
  sourceDataLength?: number
  sourceDataPrecision?: number
  sourceDataScale?: number
  targetColumn: string
  targetDataType: string
  targetDataLength?: number
  targetDataPrecision?: number
  targetDataScale?: number
  transformation?: string
  nullable: boolean
  isPrimaryKey: boolean
  isForeignKey: boolean
}

export interface DataTypeMapping {
  oracleType: string
  postgresType: string
  description: string
  transformationHint?: string
}

export interface MigrationLog {
  id: string
  timestamp: Date
  level: "info" | "warning" | "error" | "success"
  message: string
  details?: string
}

export interface MigrationProgress {
  projectId: string
  totalTables: number
  completedTables: number
  totalRows: number
  migratedRows: number
  currentTable?: string
  startTime?: Date
  estimatedEndTime?: Date
  status: "idle" | "running" | "paused" | "completed" | "error"
  logs: MigrationLog[]
}

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  role: "admin" | "user"
  createdAt: Date
}

export interface AppSettings {
  // Performance
  parallelJobs: number
  batchSize: number
  commitInterval: number

  // SMTP Configuration
  smtpEnabled: boolean
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpPassword: string
  smtpFromEmail: string
  notifyOnComplete: boolean
  notifyOnError: boolean

  // Logging
  logLevel: "debug" | "info" | "warning" | "error"
  logRetentionDays: number
  logToFile: boolean
  logFilePath: string

  // Migration
  truncateTarget: boolean
  disableConstraints: boolean
  preserveSequences: boolean
  skipErrors: boolean
  maxErrors: number
  autoCommit: boolean
}
