"use client"

import type { Project } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { OracleIcon, PostgresIcon, TableIcon, CheckIcon, ClockIcon } from "../icons"
import { Progress } from "@/components/ui/progress"

interface DashboardProps {
  project: Project | null
}

export function Dashboard({ project }: DashboardProps) {
  if (!project) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground">No Project Selected</h2>
          <p className="text-muted-foreground mt-2">Select a project from the sidebar or create a new one</p>
        </div>
      </div>
    )
  }

  // Calculate real statistics from project table mappings
  const stats = {
    totalTables: project.tableMappings?.length || 0,
    mappedTables: project.tableMappings?.filter((t) => t.status === "mapped" || t.status === "migrated").length || 0,
    migratedTables: project.tableMappings?.filter((t) => t.status === "migrated").length || 0,
    pendingTables: project.tableMappings?.filter((t) => t.status === "pending").length || 0,
  }

  return (
    <div className="p-6 space-y-6">
      {/* Project Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
          <p className="text-muted-foreground">{project.description}</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border">
          <span
            className={`w-2 h-2 rounded-full ${
              project.status === "completed"
                ? "bg-success"
                : project.status === "running"
                  ? "bg-warning animate-pulse"
                  : project.status === "configured"
                    ? "bg-primary"
                    : project.status === "error"
                      ? "bg-destructive"
                      : "bg-muted-foreground"
            }`}
          />
          <span className="text-sm font-medium capitalize">{project.status}</span>
        </div>
      </div>

      {/* Connection Status */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <OracleIcon className="w-5 h-5 text-oracle" />
              <CardTitle className="text-base">Source: Oracle</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {project.sourceConnection ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-success" />
                  <span className="text-sm text-success">Connected</span>
                </div>
                <p className="text-sm text-muted-foreground font-mono">
                  {project.sourceConnection.host}:{project.sourceConnection.port}/{project.sourceConnection.database}
                </p>
                <p className="text-xs text-muted-foreground">Schema: {project.sourceConnection.schema || "N/A"}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Not configured</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <PostgresIcon className="w-5 h-5 text-postgres" />
              <CardTitle className="text-base">Target: PostgreSQL</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {project.targetConnection ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-success" />
                  <span className="text-sm text-success">Connected</span>
                </div>
                <p className="text-sm text-muted-foreground font-mono">
                  {project.targetConnection.host}:{project.targetConnection.port}/{project.targetConnection.database}
                </p>
                <p className="text-xs text-muted-foreground">Schema: {project.targetConnection.schema || "public"}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Not configured</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Migration Progress Overview */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Migration Progress</CardTitle>
          <CardDescription>Overall status of table migrations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{Math.round((stats.migratedTables / stats.totalTables) * 100)}%</span>
          </div>
          <Progress value={(stats.migratedTables / stats.totalTables) * 100} className="h-2" />

          <div className="grid grid-cols-4 gap-4 pt-4">
            <div className="text-center p-3 rounded-lg bg-secondary/50">
              <TableIcon className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-2xl font-bold">{stats.totalTables}</p>
              <p className="text-xs text-muted-foreground">Total Tables</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-primary/10">
              <CheckIcon className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold text-primary">{stats.mappedTables}</p>
              <p className="text-xs text-muted-foreground">Mapped</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-success/10">
              <CheckIcon className="w-5 h-5 mx-auto mb-1 text-success" />
              <p className="text-2xl font-bold text-success">{stats.migratedTables}</p>
              <p className="text-xs text-muted-foreground">Migrated</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-warning/10">
              <ClockIcon className="w-5 h-5 mx-auto mb-1 text-warning" />
              <p className="text-2xl font-bold text-warning">{stats.pendingTables}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-oracle/10">
              <OracleIcon className="w-5 h-5 text-oracle" />
            </div>
            <div>
              <p className="font-medium">Configure Source</p>
              <p className="text-xs text-muted-foreground">Setup Oracle connection</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <TableIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Map Tables</p>
              <p className="text-xs text-muted-foreground">Configure table mappings</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10">
              <CheckIcon className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="font-medium">Start Migration</p>
              <p className="text-xs text-muted-foreground">Begin data transfer</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
