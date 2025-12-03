"use client"

import { useState, useEffect } from "react"
import { CheckCircle, Clock, AlertCircle, Zap } from "lucide-react"
import type { TableMappingV2 } from "@/lib/pg-migration-types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface PipelineExecutorProps {
  steps: TableMappingV2[]
  onComplete: () => void
}

interface ExecutionStatus {
  stepId: string
  status: "pending" | "executing" | "completed" | "error"
  rowsProcessed: number
  rowsTotal: number
  message: string
  startTime?: Date
  endTime?: Date
}

export default function PipelineExecutor({ steps, onComplete }: PipelineExecutorProps) {
  const [executions, setExecutions] = useState<ExecutionStatus[]>(
    steps.map((step) => ({
      stepId: step.id,
      status: "pending",
      rowsProcessed: 0,
      rowsTotal: 0,
      message: `Waiting to execute`,
    })),
  )
  const [currentStepIndex, setCurrentStepIndex] = useState(0)

  useEffect(() => {
    const executeNextStep = async () => {
      if (currentStepIndex >= steps.length) {
        return
      }

      const step = steps[currentStepIndex]
      setExecutions((prev) =>
        prev.map((e, idx) =>
          idx === currentStepIndex
            ? { ...e, status: "executing", message: `Executing ${step.targetTable}...`, startTime: new Date() }
            : e,
        ),
      )

      // Simulate execution
      await new Promise((resolve) => setTimeout(resolve, 2000 + Math.random() * 2000))

      setExecutions((prev) =>
        prev.map((e, idx) =>
          idx === currentStepIndex
            ? {
                ...e,
                status: "completed",
                rowsProcessed: Math.floor(Math.random() * 10000) + 1000,
                rowsTotal: Math.floor(Math.random() * 15000) + 5000,
                message: `Completed ${step.targetTable}`,
                endTime: new Date(),
              }
            : e,
        ),
      )

      setCurrentStepIndex((prev) => prev + 1)
    }

    if (currentStepIndex < steps.length) {
      executeNextStep()
    } else if (currentStepIndex >= steps.length && currentStepIndex > 0) {
      // All steps completed
      setTimeout(() => onComplete(), 1000)
    }
  }, [currentStepIndex, steps])

  const totalRows = executions.reduce((sum, e) => sum + e.rowsProcessed, 0)
  const completedSteps = executions.filter((e) => e.status === "completed").length
  const overallProgress = (completedSteps / steps.length) * 100

  return (
    <Card className="border-accent/30 bg-background/60 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-accent" />
              Pipeline Execution
            </CardTitle>
            <CardDescription>Step-by-step data migration in progress</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-foreground/60 uppercase tracking-wider">
              Overall Progress
            </label>
            <span className="text-sm font-mono">
              {completedSteps} / {steps.length} steps
            </span>
          </div>
          <div className="w-full h-2 bg-foreground/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent to-accent/60 transition-all duration-500"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-2 rounded border border-accent/30 bg-accent/5">
            <div className="text-xs text-foreground/60">Completed Steps</div>
            <div className="text-lg font-semibold text-accent">{completedSteps}</div>
          </div>
          <div className="p-2 rounded border border-foreground/10 bg-background">
            <div className="text-xs text-foreground/60">Total Rows Migrated</div>
            <div className="text-lg font-semibold font-mono">{totalRows.toLocaleString()}</div>
          </div>
          <div className="p-2 rounded border border-foreground/10 bg-background">
            <div className="text-xs text-foreground/60">Duration</div>
            <div className="text-lg font-semibold font-mono">
              {executions
                .filter((e) => e.endTime && e.startTime)
                .reduce((sum, e) => sum + (e.endTime!.getTime() - e.startTime!.getTime()), 0) / 1000}
              s
            </div>
          </div>
        </div>

        {/* Steps Execution */}
        <div className="border-t border-foreground/10 pt-4 space-y-2">
          <label className="text-xs font-semibold text-foreground/60 uppercase tracking-wider">Execution Steps</label>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {executions.map((exec, idx) => {
              const step = steps[idx]
              return (
                <div
                  key={exec.stepId}
                  className={cn(
                    "p-3 rounded-lg border transition-all",
                    exec.status === "executing" && "border-accent/50 bg-accent/5",
                    exec.status === "completed" && "border-green-500/30 bg-green-500/5",
                    exec.status === "error" && "border-red-500/30 bg-red-500/5",
                    exec.status === "pending" && "border-foreground/10 bg-background",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div>
                      {exec.status === "pending" && <Clock className="h-5 w-5 text-foreground/40 mt-0.5" />}
                      {exec.status === "executing" && (
                        <div className="h-5 w-5 border-2 border-accent border-t-transparent rounded-full animate-spin mt-0.5" />
                      )}
                      {exec.status === "completed" && <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />}
                      {exec.status === "error" && <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-mono text-sm">
                            Step {idx + 1}: {step.targetTable}
                          </p>
                          <p className="text-xs text-foreground/60 mt-1">{exec.message}</p>
                        </div>
                      </div>
                      {exec.status !== "pending" && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 h-1 bg-foreground/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-accent transition-all"
                              style={{
                                width: exec.rowsTotal ? `${(exec.rowsProcessed / exec.rowsTotal) * 100}%` : "0%",
                              }}
                            />
                          </div>
                          <span className="text-xs font-mono text-foreground/50 whitespace-nowrap">
                            {exec.rowsProcessed.toLocaleString()} / {exec.rowsTotal.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
