"use client"

import { useState, useEffect } from "react"
import { Clock, AlertCircle, CheckCircle, Info, XCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { apiService } from "@/lib/api"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"

interface PipelineLogsViewProps {
    pipelineId: string
}

interface PipelineLog {
    id: string
    timestamp: string
    level: "info" | "warning" | "error" | "success"
    message: string
    details?: string
    stepId?: string
}

export default function PipelineLogsView({ pipelineId }: PipelineLogsViewProps) {
    const [logs, setLogs] = useState<PipelineLog[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadLogs()
        const interval = setInterval(loadLogs, 5000) // Refresh every 5 seconds
        return () => clearInterval(interval)
    }, [pipelineId])

    const loadLogs = async () => {
        try {
            const result = await apiService.getPipelineLogs(pipelineId)
            if (result.data) {
                setLogs(result.data as PipelineLog[])
            }
        } catch (error) {
            if (loading) {
                toast.error("Failed to load logs", error instanceof Error ? error.message : "Unknown error")
            }
        } finally {
            setLoading(false)
        }
    }

    const getLevelIcon = (level: string) => {
        switch (level) {
            case "success":
                return <CheckCircle className="h-4 w-4 text-green-500" />
            case "error":
                return <XCircle className="h-4 w-4 text-red-500" />
            case "warning":
                return <AlertCircle className="h-4 w-4 text-yellow-500" />
            default:
                return <Info className="h-4 w-4 text-blue-500" />
        }
    }

    const formatTimestamp = (timestamp: string) => {
        return new Date(timestamp).toLocaleString()
    }

    return (
        <Card className="border-accent/30 bg-background/60 backdrop-blur-sm">
            <CardHeader>
                <CardTitle>Pipeline Logs</CardTitle>
                <CardDescription>Execution logs and status messages</CardDescription>
            </CardHeader>
            <CardContent>
                {loading && logs.length === 0 ? (
                    <div className="text-center py-8 text-foreground/50">Loading logs...</div>
                ) : logs.length === 0 ? (
                    <div className="text-center py-8 text-foreground/50">No logs available</div>
                ) : (
                    <ScrollArea className="h-[600px]">
                        <div className="space-y-2">
                            {logs.map((log) => (
                                <div
                                    key={log.id}
                                    className={cn(
                                        "flex gap-3 p-3 rounded-lg border",
                                        log.level === "error" && "bg-red-500/10 border-red-500/20",
                                        log.level === "warning" && "bg-yellow-500/10 border-yellow-500/20",
                                        log.level === "success" && "bg-green-500/10 border-green-500/20",
                                        log.level === "info" && "bg-background border-foreground/10",
                                    )}
                                >
                                    <div className="flex-shrink-0 mt-0.5">{getLevelIcon(log.level)}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1">
                                                <p className="text-sm font-medium">{log.message}</p>
                                                {log.details && (
                                                    <p className="text-xs text-foreground/60 mt-1 whitespace-pre-wrap">{log.details}</p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <Badge variant="outline" className="text-xs">
                                                    {log.level}
                                                </Badge>
                                                <div className="flex items-center gap-1 text-xs text-foreground/50">
                                                    <Clock className="h-3 w-3" />
                                                    {formatTimestamp(log.timestamp)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    )
}

