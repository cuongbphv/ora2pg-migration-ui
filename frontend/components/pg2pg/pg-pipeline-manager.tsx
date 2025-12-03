"use client"

import { useState, useEffect } from "react"
import { Plus, Play, Pause, Trash2, Edit2, Settings, Eye, Database, Clock, CheckCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { apiService } from "@/lib/api"
import { toast } from "@/lib/toast"
import type { Pipeline } from "@/lib/pg-migration-types"

interface PGPipelineManagerProps {
    onSelectPipeline?: (id: string) => void
}

export default function PGPipelineManager({ onSelectPipeline }: PGPipelineManagerProps) {
    const [pipelines, setPipelines] = useState<Pipeline[]>([])
    const [loading, setLoading] = useState(true)
    const [createOpen, setCreateOpen] = useState(false)
    const [newPipelineName, setNewPipelineName] = useState("")
    const [newPipelineDesc, setNewPipelineDesc] = useState("")

    useEffect(() => {
        loadPipelines()
    }, [])

    const loadPipelines = async () => {
        setLoading(true)
        try {
            const result = await apiService.getPipelines()
            if (result.data) {
                setPipelines(result.data as Pipeline[])
            } else if (result.error) {
                toast.error("Failed to load pipelines", result.error)
            }
        } catch (error) {
            toast.error("Failed to load pipelines", error instanceof Error ? error.message : "Unknown error")
        } finally {
            setLoading(false)
        }
    }

    const handleCreate = async () => {
        if (!newPipelineName.trim()) {
            toast.error("Pipeline name is required")
            return
        }
        try {
            const result = await apiService.createPipeline(newPipelineName, newPipelineDesc)
            if (result.data) {
                toast.success("Pipeline created", "Pipeline created successfully")
                setCreateOpen(false)
                setNewPipelineName("")
                setNewPipelineDesc("")
                loadPipelines()
            } else if (result.error) {
                toast.error("Failed to create pipeline", result.error)
            }
        } catch (error) {
            toast.error("Failed to create pipeline", error instanceof Error ? error.message : "Unknown error")
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this pipeline?")) return
        try {
            const result = await apiService.deletePipeline(id)
            if (!result.error) {
                toast.success("Pipeline deleted", "Pipeline deleted successfully")
                loadPipelines()
            } else {
                toast.error("Failed to delete pipeline", result.error)
            }
        } catch (error) {
            toast.error("Failed to delete pipeline", error instanceof Error ? error.message : "Unknown error")
        }
    }

    const handleStart = async (id: string) => {
        try {
            const result = await apiService.startPipeline(id)
            if (!result.error) {
                toast.success("Pipeline started", "Pipeline execution started")
                loadPipelines()
            } else {
                toast.error("Failed to start pipeline", result.error)
            }
        } catch (error) {
            toast.error("Failed to start pipeline", error instanceof Error ? error.message : "Unknown error")
        }
    }

    const handleStop = async (id: string) => {
        try {
            const result = await apiService.stopPipeline(id)
            if (!result.error) {
                toast.success("Pipeline stopped", "Pipeline execution stopped")
                loadPipelines()
            } else {
                toast.error("Failed to stop pipeline", result.error)
            }
        } catch (error) {
            toast.error("Failed to stop pipeline", error instanceof Error ? error.message : "Unknown error")
        }
    }

    const getStatusBadge = (status: string) => {
        const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
            draft: "outline",
            configured: "secondary",
            running: "default",
            completed: "default",
            error: "destructive",
            paused: "secondary",
        }
        return <Badge variant={variants[status] || "outline"}>{status}</Badge>
    }

    const formatDate = (date: Date | string | null | undefined) => {
        if (!date) return "Never"
        const d = typeof date === "string" ? new Date(date) : date
        return d.toLocaleString()
    }

    return (
        <div className="p-6 space-y-6">
            <Card className="border-accent/30 bg-background/60 backdrop-blur-sm">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-2xl">Pg2Pg Pipeline Manager</CardTitle>
                            <CardDescription>Manage your PostgreSQL migration pipelines</CardDescription>
                        </div>
                        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" className="bg-accent hover:bg-accent/90">
                                    <Plus className="mr-2 h-4 w-4" />
                                    New Pipeline
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Create New Pipeline</DialogTitle>
                                    <DialogDescription>Create a new PostgreSQL migration pipeline</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Pipeline Name</Label>
                                        <Input
                                            id="name"
                                            value={newPipelineName}
                                            onChange={(e) => setNewPipelineName(e.target.value)}
                                            placeholder="e.g., Production Migration"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="description">Description</Label>
                                        <Textarea
                                            id="description"
                                            value={newPipelineDesc}
                                            onChange={(e) => setNewPipelineDesc(e.target.value)}
                                            placeholder="Optional description"
                                            rows={3}
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <Button variant="outline" onClick={() => setCreateOpen(false)}>
                                            Cancel
                                        </Button>
                                        <Button onClick={handleCreate}>Create</Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
            </Card>

            {loading ? (
                <Card>
                    <CardContent className="pt-8 text-center">
                        <p className="text-foreground/50">Loading pipelines...</p>
                    </CardContent>
                </Card>
            ) : pipelines.length === 0 ? (
                <Card>
                    <CardContent className="pt-8 text-center">
                        <p className="text-foreground/50">No pipelines found. Create your first pipeline to get started.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {pipelines.map((pipeline) => (
                        <Card key={pipeline.id} className="border-accent/30 bg-background/60 backdrop-blur-sm">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <CardTitle className="text-lg">{pipeline.name}</CardTitle>
                                        <CardDescription className="mt-1">{pipeline.description || "No description"}</CardDescription>
                                    </div>
                                    {getStatusBadge(pipeline.status)}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <div className="text-xs text-foreground/60 uppercase tracking-wider">Steps</div>
                                        <div className="font-semibold">{pipeline.steps?.length || 0}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-foreground/60 uppercase tracking-wider">Runs</div>
                                        <div className="font-semibold">{pipeline.totalRuns || 0}</div>
                                    </div>
                                </div>

                                {pipeline.lastRunAt && (
                                    <div className="flex items-center gap-2 text-xs text-foreground/60">
                                        <Clock className="h-3 w-3" />
                                        Last run: {formatDate(pipeline.lastRunAt)}
                                    </div>
                                )}

                                {!pipeline.lastRunAt && (
                                    <div className="flex items-center gap-2 text-xs text-foreground/60">
                                        <Clock className="h-3 w-3" />
                                        Not started
                                    </div>
                                )}

                                <div className="flex items-center gap-2 pt-2 border-t border-foreground/10">
                                    <div className="flex items-center gap-1 text-xs text-foreground/60">
                                        {pipeline.sourceConnection ? (
                                            <CheckCircle className="h-3 w-3 text-green-500" />
                                        ) : (
                                            <XCircle className="h-3 w-3 text-red-500" />
                                        )}
                                        Source
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-foreground/60">
                                        {pipeline.targetConnection ? (
                                            <CheckCircle className="h-3 w-3 text-green-500" />
                                        ) : (
                                            <XCircle className="h-3 w-3 text-red-500" />
                                        )}
                                        Target
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => onSelectPipeline?.(pipeline.id)}
                                    >
                                        <Settings className="mr-2 h-4 w-4" />
                                        Configure
                                    </Button>
                                    {pipeline.status === "running" ? (
                                        <Button variant="outline" size="sm" onClick={() => handleStop(pipeline.id)}>
                                            <Pause className="h-4 w-4" />
                                        </Button>
                                    ) : (
                                        <Button variant="outline" size="sm" onClick={() => handleStart(pipeline.id)}>
                                            <Play className="h-4 w-4" />
                                        </Button>
                                    )}
                                    <Button variant="outline" size="sm" onClick={() => handleDelete(pipeline.id)}>
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}

