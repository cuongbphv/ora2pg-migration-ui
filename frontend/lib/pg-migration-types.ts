// PostgreSQL to PostgreSQL specific types
export type TransformationType =
    | "direct"
    | "case-when"
    | "subquery"
    | "function"
    | "static"
    | "concat"
    | "type-cast"
    | "coalesce"

export interface ColumnMappingV2 {
    id: string
    sourceColumn: string
    sourceDataType: string
    targetColumn: string
    targetDataType: string
    transformationType: TransformationType
    transformation?: string
    description?: string
    nullable: boolean
    isPrimaryKey: boolean
    isForeignKey: boolean
}

export interface TableMappingV2 {
    id: string
    order: number
    sourceSchema: string
    sourceTable: string
    targetSchema: string
    targetTable: string
    description?: string
    filter?: {
        enabled: boolean
        whereClause: string
        description?: string
    }
    options?: {
        disableTriggers?: boolean
        disableConstraints?: boolean
    }
    columnMappings: ColumnMappingV2[]
    status: "draft" | "configured" | "executing" | "completed" | "error"
}

export interface PipelineStep {
    id: string
    tableMapping: TableMappingV2
    order: number
    status: "pending" | "executing" | "completed" | "error"
    rowsProcessed?: number
    rowsFailed?: number
    startTime?: Date
    endTime?: Date
    errorMessage?: string
}

export interface PipelineExecution {
    id: string
    projectId: string
    steps: PipelineStep[]
    status: "pending" | "running" | "completed" | "paused" | "error"
    totalRows: number
    processedRows: number
    failedRows: number
    startTime?: Date
    endTime?: Date
    estimatedEndTime?: Date
}

export interface TransformationTemplate {
    id: string
    name: string
    type: TransformationType
    description: string
    template: string
    examples: string[]
}

export interface Pipeline {
    id: string
    name: string
    description?: string
    steps?: TableMappingV2[]
    sourceConnection?: ConnectionConfig
    targetConnection?: ConnectionConfig
    totalRuns?: number
    lastRunAt?: Date | string
    status: "draft" | "configured" | "running" | "completed" | "error" | "paused"
    createdAt?: Date | string
    updatedAt?: Date | string
    userId?: string
}

export interface PipelineRun {
    id: string
    pipelineId: string
    startTime: Date
    endTime?: Date
    status: "running" | "completed" | "failed" | "paused"
    totalRows: number
    processedRows: number
    failedRows: number
    executions: PipelineStepExecution[]
}

export interface PipelineStepExecution {
    stepId: string
    stepName: string
    order: number
    startTime: Date
    endTime?: Date
    status: "pending" | "running" | "completed" | "failed"
    rowsProcessed: number
    rowsFailed: number
    errorMessage?: string
}

// ConnectionConfig interface
export interface ConnectionConfig {
    type?: string
    host: string
    port: number
    database: string
    schema?: string
    username: string
    password?: string
    connectionString?: string
    isConnected?: boolean
}
