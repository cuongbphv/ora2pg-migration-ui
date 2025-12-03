"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronRight, Plus, Trash2, Edit2, Play, ArrowLeft, Database, Save, Settings, Eye } from "lucide-react"
import type { TableMappingV2, Pipeline } from "@/lib/pg-migration-types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { apiService } from "@/lib/api"
import { toast } from "@/lib/toast"
import MappingEditor from "./pg-mapping-editor"
import PipelineExecutor from "./pg-pipeline-executor"
import PipelineConnectionConfig from "./pg-pipeline-connection-config"
import PipelineLogsView from "./pg-pipeline-logs-view"
import JsonImportDialog from "./json-import-dialog"

interface PGPipelineBuilderProps {
    pipelineId: string
    onBack: () => void
}

export default function PGPipelineBuilder({ pipelineId, onBack }: PGPipelineBuilderProps) {
    const [pipeline, setPipeline] = useState<Pipeline | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [selectedStep, setSelectedStep] = useState<TableMappingV2 | null>(null)
    const [showEditor, setShowEditor] = useState(false)
    const [isExecuting, setIsExecuting] = useState(false)
    const [activeTab, setActiveTab] = useState("steps")

    const loadPipeline = useCallback(async () => {
        setLoading(true)
        try {
            const result = await apiService.getPipeline(pipelineId)
            if (result.data) {
                const p = result.data as Pipeline
                setPipeline(p)
                if (p.steps && p.steps.length > 0) {
                    setSelectedStep(p.steps[0])
                }
            } else if (result.error) {
                toast.error("Failed to load pipeline", result.error)
            }
        } catch (error) {
            toast.error("Failed to load pipeline", error instanceof Error ? error.message : "Unknown error")
        } finally {
            setLoading(false)
        }
    }, [pipelineId])

    useEffect(() => {
        loadPipeline()
    }, [loadPipeline])

    const savePipeline = async () => {
        if (!pipeline) return
        setSaving(true)
        try {
            const result = await apiService.updatePipeline(pipeline)
            if (result.data) {
                setPipeline(result.data as Pipeline)
                toast.success("Pipeline saved", "Pipeline configuration saved successfully")
            } else if (result.error) {
                toast.error("Failed to save pipeline", result.error)
            }
        } catch (error) {
            toast.error("Failed to save pipeline", error instanceof Error ? error.message : "Unknown error")
        } finally {
            setSaving(false)
        }
    }

    const addStep = async () => {
        if (!pipeline) return
        const newStep: TableMappingV2 = {
            id: "",
            order: (pipeline.steps?.length || 0) + 1,
            sourceSchema: "",
            sourceTable: "",
            targetSchema: "",
            targetTable: "",
            columnMappings: [],
            status: "draft",
        }
        try {
            const result = await apiService.addStepToPipeline(pipelineId, newStep)
            if (result.data) {
                await loadPipeline()
                const updatedPipeline = await apiService.getPipeline(pipelineId)
                if (updatedPipeline.data) {
                    const p = updatedPipeline.data as Pipeline
                    if (p.steps && p.steps.length > 0) {
                        setSelectedStep(p.steps[p.steps.length - 1])
                    }
                }
            }
        } catch (error) {
            toast.error("Failed to add step", error instanceof Error ? error.message : "Unknown error")
        }
    }

    const deleteStep = async (id: string) => {
        if (!pipeline) return
        try {
            const result = await apiService.deleteStep(id)
            if (!result.error) {
                await loadPipeline()
                if (pipeline.steps) {
                    const remaining = pipeline.steps.filter((s) => s.id !== id)
                    setSelectedStep(remaining[0] || null)
                }
            } else {
                toast.error("Failed to delete step", result.error)
            }
        } catch (error) {
            toast.error("Failed to delete step", error instanceof Error ? error.message : "Unknown error")
        }
    }

    const updateStep = async (updated: TableMappingV2) => {
        if (!updated.id) return
        try {
            const result = await apiService.updateStep(updated.id, updated)
            if (result.data) {
                await loadPipeline()
                setShowEditor(false)
                toast.success("Step updated", "Step configuration saved")
            } else if (result.error) {
                toast.error("Failed to update step", result.error)
            }
        } catch (error) {
            toast.error("Failed to update step", error instanceof Error ? error.message : "Unknown error")
        }
    }

    const handleStart = async () => {
        if (!pipeline) return
        try {
            const result = await apiService.startPipeline(pipelineId)
            if (!result.error) {
                setIsExecuting(true)
                await loadPipeline()
                toast.success("Pipeline started", "Pipeline execution started")
            } else {
                toast.error("Failed to start pipeline", result.error)
            }
        } catch (error) {
            toast.error("Failed to start pipeline", error instanceof Error ? error.message : "Unknown error")
        }
    }

    if (loading) {
        return (
            <div className="p-6">
                <Card>
                    <CardContent className="pt-8 text-center">
                        <p className="text-foreground/50">Loading pipeline...</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (!pipeline) {
        return (
            <div className="p-6">
                <Card>
                    <CardContent className="pt-8 text-center">
                        <p className="text-foreground/50">Pipeline not found</p>
                        <Button onClick={onBack} className="mt-4">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Manager
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const steps = pipeline.steps || []

    return (
        <div className="p-6 space-y-6">
            {/* Pipeline Header */}
            <Card className="border-accent/30 bg-background/60 backdrop-blur-sm">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="sm" onClick={onBack}>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back
                            </Button>
                            <div>
                                <CardTitle className="text-2xl">{pipeline.name}</CardTitle>
                                <CardDescription>{pipeline.description || "PostgreSQL Migration Pipeline"}</CardDescription>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={savePipeline} variant="outline" size="sm" disabled={saving}>
                                <Save className="mr-2 h-4 w-4" />
                                {saving ? "Saving..." : "Save"}
                            </Button>
                            {pipeline.status !== "running" && (
                                <Button 
                                    onClick={handleStart} 
                                    size="sm" 
                                    className="bg-accent hover:bg-accent/90"
                                    disabled={!pipeline.sourceConnection || !pipeline.targetConnection}
                                >
                                    <Play className="mr-2 h-4 w-4" />
                                    Start Pipeline
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="steps">Steps</TabsTrigger>
                    <TabsTrigger value="connections">Connections</TabsTrigger>
                    <TabsTrigger value="logs">Logs</TabsTrigger>
                </TabsList>

                <TabsContent value="steps" className="space-y-4">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 h-[calc(100vh-280px)]">
                        {/* Pipeline Steps */}
                        <div className="lg:col-span-1 space-y-2 flex flex-col">
                            <div className="flex items-center justify-between flex-shrink-0">
                                <h3 className="text-sm font-semibold text-foreground/80">Pipeline Steps ({steps.length})</h3>
                                <div className="flex gap-2">
                                    <JsonImportDialog 
                                        pipelineId={pipelineId} 
                                        onImportSuccess={loadPipeline}
                                    />
                                    <Button onClick={addStep} variant="outline" size="sm">
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-2 flex-1 overflow-y-auto min-h-0">
                                {steps.map((step, idx) => {
                                    const stepNumber = step.order != null && step.order > 0 ? step.order : idx + 1;
                                    return (
                                        <div key={step.id}>
                                            <button
                                                onClick={() => setSelectedStep(step)}
                                                className={cn(
                                                    "w-full px-3 py-2 rounded-lg text-left text-sm transition-all",
                                                    selectedStep?.id === step.id
                                                        ? "bg-accent/20 border border-accent/50 text-foreground"
                                                        : "border border-transparent hover:bg-background/80 text-foreground/70",
                                                )}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="font-mono text-xs text-accent">Step {stepNumber}</div>
                                                        <div className="truncate font-medium">{step.sourceTable || "New Step"}</div>
                                                        <div className="text-xs text-foreground/50">
                                                            {step.targetSchema}.{step.targetTable}
                                                        </div>
                                                    </div>
                                                    <div
                                                        className={cn(
                                                            "w-2 h-2 rounded-full mt-1 flex-shrink-0",
                                                            step.status === "configured" && "bg-blue-500",
                                                            step.status === "executing" && "bg-yellow-500",
                                                            step.status === "completed" && "bg-green-500",
                                                            step.status === "error" && "bg-red-500",
                                                            (!step.status || step.status === "draft") && "bg-gray-400",
                                                        )}
                                                    />
                                                </div>
                                            </button>
                                            {idx < steps.length - 1 && (
                                                <div className="flex justify-center py-1">
                                                    <ChevronRight className="h-4 w-4 text-foreground/30 rotate-90" />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Step Details & Editor */}
                        <div className="lg:col-span-2 flex flex-col min-h-0">
                            {selectedStep ? (
                                <>
                                    {!showEditor ? (
                                        <Card className="border-accent/30 bg-background/60 backdrop-blur-sm flex flex-col h-full">
                                            <CardHeader className="flex-shrink-0">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <CardTitle>Step {selectedStep.order != null && selectedStep.order > 0 ? selectedStep.order : (steps.findIndex(s => s.id === selectedStep.id) + 1)}</CardTitle>
                                                        <CardDescription>{selectedStep.description || "No description"}</CardDescription>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button onClick={() => setShowEditor(true)} variant="outline" size="sm">
                                                            <Edit2 className="h-4 w-4" />
                                                        </Button>
                                                        <Button onClick={() => deleteStep(selectedStep.id)} variant="outline" size="sm">
                                                            <Trash2 className="h-4 w-4 text-red-500" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="space-y-4 flex-1 flex flex-col min-h-0 overflow-hidden">
                                                <div className="grid grid-cols-2 gap-4 flex-shrink-0">
                                                    <div>
                                                        <label className="text-xs font-semibold text-foreground/60 uppercase tracking-wider">Source</label>
                                                        <div className="font-mono text-sm mt-1">
                                                            {selectedStep.sourceSchema}.{selectedStep.sourceTable}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-semibold text-foreground/60 uppercase tracking-wider">Target</label>
                                                        <div className="font-mono text-sm mt-1">
                                                            {selectedStep.targetSchema}.{selectedStep.targetTable}
                                                        </div>
                                                    </div>
                                                </div>

                                                {selectedStep.filter?.enabled && (
                                                    <div className="border-t border-foreground/10 pt-4 flex-shrink-0">
                                                        <label className="text-xs font-semibold text-foreground/60 uppercase tracking-wider">Filter</label>
                                                        <code className="block text-xs bg-background border border-foreground/10 rounded p-2 mt-1 text-accent overflow-x-auto">
                                                            WHERE {selectedStep.filter.whereClause}
                                                        </code>
                                                    </div>
                                                )}

                                                <div className="border-t border-foreground/10 pt-4 flex-1 flex flex-col min-h-0">
                                                    <label className="text-xs font-semibold text-foreground/60 uppercase tracking-wider mb-2 block flex-shrink-0">
                                                        Column Mappings ({selectedStep.columnMappings?.length || 0})
                                                    </label>
                                                    {!selectedStep.columnMappings || selectedStep.columnMappings.length === 0 ? (
                                                        <p className="text-sm text-foreground/50 italic">No columns mapped yet</p>
                                                    ) : (
                                                        <div className="space-y-1 flex-1 overflow-y-auto min-h-0 pr-2">
                                                            {selectedStep.columnMappings.map((col) => (
                                                                <div key={col.id} className="text-xs bg-background border border-foreground/5 rounded p-1.5 pl-2 mb-1">
                                                                    <span className="text-accent font-medium">{col.sourceColumn}</span>
                                                                    <span className="text-foreground/50 mx-1">→</span>
                                                                    <span className="font-medium">{col.targetColumn}</span>
                                                                    {col.transformation && col.transformation !== col.sourceColumn && (
                                                                        <span className="text-foreground/40 text-[10px] ml-2 italic">({col.transformationType || 'transformed'})</span>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ) : (
                                        <div className="h-full">
                                            <MappingEditor
                                                step={selectedStep}
                                                onSave={(updated) => updateStep(updated)}
                                                onCancel={() => setShowEditor(false)}
                                            />
                                        </div>
                                    )}
                                </>
                            ) : (
                                <Card className="border-accent/30 bg-background/60 backdrop-blur-sm h-full flex items-center justify-center">
                                    <CardContent className="pt-8 text-center">
                                        <p className="text-foreground/50">Select a step to view details</p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="connections">
                    <PipelineConnectionConfig pipelineId={pipelineId} pipeline={pipeline} onUpdate={loadPipeline} />
                </TabsContent>

                <TabsContent value="logs">
                    <PipelineLogsView pipelineId={pipelineId} />
                </TabsContent>
            </Tabs>

            {/* Pipeline Executor */}
            {isExecuting && <PipelineExecutor steps={steps} onComplete={() => setIsExecuting(false)} />}
        </div>
    )
}
