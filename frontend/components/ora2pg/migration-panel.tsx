"use client"

import { useState, useEffect, useCallback } from "react"
import type { MigrationProgress, MigrationLog } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { PlayIcon, PauseIcon, CheckIcon, AlertIcon, ClockIcon, DownloadIcon } from "../icons"
import { cn } from "@/lib/utils"
import { apiService } from "@/lib/api"
import { toast } from "@/lib/toast"

interface MigrationPanelProps {
  projectId?: string | null
}

export function MigrationPanel({ projectId }: MigrationPanelProps) {
  const [progress, setProgress] = useState<MigrationProgress | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [loading, setLoading] = useState(false)

  const loadProgress = useCallback(async () => {
    if (!projectId) return
    try {
      const result = await apiService.getMigrationProgress(projectId)
      if (result.data) {
        const migrationData = result.data as MigrationProgress
        setProgress(migrationData)
        setIsRunning(migrationData.status === "running")
      } else {
        // If no data returned, migration might not have started yet
        // Set default progress state
        setProgress(null)
        setIsRunning(false)
      }
    } catch (error) {
      console.error("Failed to load migration progress:", error)
      // On error, don't clear existing progress - might be a temporary network issue
    }
  }, [projectId])

  // Load migration progress on mount and when projectId changes
  useEffect(() => {
    if (projectId) {
      loadProgress()
    } else {
      // Reset state when no project is selected
      setProgress(null)
      setIsRunning(false)
    }
  }, [projectId, loadProgress])

  // Separate polling effect - only poll when migration is running
  useEffect(() => {
    if (!projectId || !isRunning) return

    const interval = setInterval(() => {
      loadProgress()
    }, 2000)

    return () => clearInterval(interval)
  }, [projectId, isRunning, loadProgress])

  // Also poll when status is paused to show updates
  useEffect(() => {
    if (!projectId || progress?.status !== "paused") return

    const interval = setInterval(() => {
      loadProgress()
    }, 5000) // Poll less frequently for paused migrations

    return () => clearInterval(interval)
  }, [projectId, progress?.status, loadProgress])

  const handleStartMigration = async () => {
    if (!projectId) {
      toast.warning("Project required", "Please select a project first")
      return
    }

    try {
      setLoading(true)
      const result = await apiService.startMigration(projectId)
      if (result.data) {
        setProgress(result.data)
        setIsRunning(true)
        toast.success("Migration started", "Migration is now running")
      } else {
        toast.error("Failed to start migration", result.error || "Please check your configuration")
      }
    } catch (error) {
      console.error("Failed to start migration:", error)
      toast.error("Failed to start migration", "Please try again")
    } finally {
      setLoading(false)
    }
  }

  const handlePauseMigration = async () => {
    if (!projectId) return
    try {
      const result = await apiService.pauseMigration(projectId)
      if (result.data) {
        setProgress(result.data)
        setIsRunning(false)
      }
    } catch (error) {
      console.error("Failed to pause migration:", error)
    }
  }

  const handleResumeMigration = async () => {
    if (!projectId) return
    try {
      const result = await apiService.resumeMigration(projectId)
      if (result.data) {
        setProgress(result.data)
        setIsRunning(true)
      }
    } catch (error) {
      console.error("Failed to resume migration:", error)
    }
  }

  const formatTime = (date?: Date | string) => {
    if (!date) return "--:--:--"
    const d = typeof date === "string" ? new Date(date) : date
    return d.toLocaleTimeString()
  }

  const formatDuration = (start?: Date | string, end?: Date | string, status?: string) => {
    if (!start) return "0:00:00"
    const startDate = typeof start === "string" ? new Date(start) : start
    // Use end time if migration is completed/error, otherwise use current time for running migrations
    const endDate = end 
      ? (typeof end === "string" ? new Date(end) : end)
      : (status === "completed" || status === "error" ? startDate : new Date())
    const diff = endDate.getTime() - startDate.getTime()
    const hours = Math.floor(diff / 3600000)
    const minutes = Math.floor((diff % 3600000) / 60000)
    const seconds = Math.floor((diff % 60000) / 1000)
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  const getLogIcon = (level: MigrationLog["level"]) => {
    switch (level) {
      case "success":
        return <CheckIcon className="w-4 h-4 text-success" />
      case "warning":
        return <AlertIcon className="w-4 h-4 text-warning" />
      case "error":
        return <AlertIcon className="w-4 h-4 text-destructive" />
      default:
        return <ClockIcon className="w-4 h-4 text-muted-foreground" />
    }
  }

  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground">No Project Selected</h2>
          <p className="text-muted-foreground mt-2">Select a project from the sidebar to start migration</p>
        </div>
      </div>
    )
  }

  if (!progress) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground">No Migration Data</h2>
          <p className="text-muted-foreground mt-2 mb-4">Start a migration to see progress</p>
          <Button onClick={handleStartMigration} disabled={loading}>
            {loading ? "Starting..." : "Start Migration"}
          </Button>
        </div>
      </div>
    )
  }

  const tableProgress = progress.totalTables > 0 
    ? Math.round((progress.completedTables / progress.totalTables) * 100) 
    : 0
  const rowProgress = progress.totalRows > 0 
    ? Math.round((progress.migratedRows / progress.totalRows) * 100) 
    : 0

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Migration Execution</h1>
          <p className="text-muted-foreground">Execute and monitor database migration progress</p>
        </div>
        <div className="flex items-center gap-2">
          {isRunning ? (
            <Button variant="outline" onClick={handlePauseMigration} disabled={loading}>
              <PauseIcon className="w-4 h-4 mr-2" />
              Pause
            </Button>
          ) : progress.status === "paused" ? (
            <Button onClick={handleResumeMigration} disabled={loading}>
              <PlayIcon className="w-4 h-4 mr-2" />
              Resume
            </Button>
          ) : (
            <Button onClick={handleStartMigration} disabled={loading || progress.status === "running"}>
              <PlayIcon className="w-4 h-4 mr-2" />
              {progress.status === "completed" ? "Restart" : "Start Migration"}
            </Button>
          )}
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Status</p>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={cn(
                  "w-2 h-2 rounded-full",
                  progress.status === "running" && "bg-warning animate-pulse",
                  progress.status === "completed" && "bg-success",
                  progress.status === "error" && "bg-destructive",
                  progress.status === "idle" && "bg-muted-foreground",
                  progress.status === "paused" && "bg-warning",
                )}
              />
              <span className="font-medium capitalize">{progress.status}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Duration</p>
            <p className="text-xl font-mono font-bold mt-1">
              {formatDuration(progress.startTime, progress.endTime, progress.status)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Tables</p>
            <p className="text-xl font-bold mt-1">
              {progress.completedTables} / {progress.totalTables}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Rows Migrated</p>
            <p className="text-xl font-bold mt-1">
              {progress.migratedRows.toLocaleString()} / {progress.totalRows.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bars */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base">Migration Progress</CardTitle>
          {progress.currentTable && (
            <CardDescription>
              Currently processing: <span className="font-mono text-foreground">{progress.currentTable}</span>
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Table Progress</span>
              <span className="font-medium">{tableProgress}%</span>
            </div>
            <Progress value={tableProgress} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Row Progress</span>
              <span className="font-medium">{rowProgress}%</span>
            </div>
            <Progress value={rowProgress} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Migration Log */}
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Migration Log</CardTitle>
            <CardDescription>Real-time migration activity log</CardDescription>
          </div>
          <Button variant="outline" size="sm">
            <DownloadIcon className="w-4 h-4 mr-2" />
            Export Log
          </Button>
        </CardHeader>
        <CardContent>
          <div className="bg-background rounded-lg border border-border max-h-80 overflow-y-auto">
            <div className="divide-y divide-border">
              {(progress.logs || [])
                .slice()
                .reverse()
                .map((log) => (
                  <div key={log.id} className="flex items-start gap-3 p-3 hover:bg-muted/30 transition-colors">
                    {getLogIcon(log.level)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{log.message}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(log.timestamp)}
                        </span>
                      </div>
                      {log.details && <p className="text-xs text-muted-foreground mt-0.5">{log.details}</p>}
                    </div>
                  </div>
                ))}
              {(!progress.logs || progress.logs.length === 0) && (
                <div className="p-6 text-center text-muted-foreground">
                  <p>No logs available yet</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
