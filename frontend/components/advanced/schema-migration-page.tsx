"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { AlertIcon, PlayIcon, DownloadIcon, CopyIcon, TableIcon, KeyIcon, LinkIcon, LayersIcon, EyeIcon } from "@/components/icons"
import { apiService } from "@/lib/api"
import { toast } from "@/lib/toast"
import type { Project } from "@/lib/types"

interface SchemaObject {
  name: string
  schema?: string
  type: "table" | "index" | "constraint" | "sequence" | "view"
  status: "pending" | "generated" | "applied" | "error"
  ddl: string
  issues?: string[]
  sourceDdl?: string
  targetSchema?: string
}

interface SchemaMigrationPageProps {
  projectId: string
  project?: Project
}

export function SchemaMigrationPage({ projectId, project: initialProject }: SchemaMigrationPageProps) {
  const [activeTab, setActiveTab] = useState("indexes")
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [includeIndexes, setIncludeIndexes] = useState(true)
  const [includeConstraints, setIncludeConstraints] = useState(true)
  const [includeSequences, setIncludeSequences] = useState(true)
  const [includeViews, setIncludeViews] = useState(true)
  const [targetSchema, setTargetSchema] = useState("public")
  const [project, setProject] = useState<Project | null>(initialProject || null)
  const [loading, setLoading] = useState(false)

  const [schemaObjects, setSchemaObjects] = useState<SchemaObject[]>([])
  const [selectedObject, setSelectedObject] = useState<SchemaObject | null>(null)
  const [allDDL, setAllDDL] = useState("")

  // Load project if not provided
  useEffect(() => {
    if (projectId && !project) {
      loadProject()
    }
  }, [projectId, project])

  const loadProject = async () => {
    try {
      const result = await apiService.getProject(projectId)
      if (result.data) {
        setProject(result.data as Project)
        // Set target schema from project if available
        if (result.data.targetConnection?.schema) {
          setTargetSchema(result.data.targetConnection.schema)
        }
      } else if (result.error) {
        toast.error("Failed to load project", result.error)
      }
    } catch (error) {
      toast.error("Failed to load project", error instanceof Error ? error.message : "Unknown error")
    }
  }

  const generateDDL = async () => {
    if (!projectId) {
      toast.error("No project selected")
      return
    }

    setIsGenerating(true)
    setProgress(0)
    setLoading(true)

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 300)

      const result = await apiService.generateSchemaDDL(projectId, {
        targetSchema,
        includeIndexes,
        includeConstraints,
        includeSequences,
        includeViews,
      })

      clearInterval(progressInterval)
      setProgress(100)

      if (result.data) {
        const objects = result.data as SchemaObject[]
        setSchemaObjects(objects)
        
        // Select first object if available
        if (objects.length > 0) {
          setSelectedObject(objects[0])
          // Set active tab based on first object type
          if (objects[0].type === "index") {
            setActiveTab("indexes")
          } else if (!["table", "index"].includes(objects[0].type)) {
            setActiveTab("others")
          }
        }
        
        // Get all DDL
        const allDDLResult = await apiService.generateAllSchemaDDL(projectId, {
          targetSchema,
          includeIndexes,
          includeConstraints,
          includeSequences,
          includeViews,
        })
        
        if (allDDLResult.data && (allDDLResult.data as any).allDDL) {
          setAllDDL((allDDLResult.data as any).allDDL)
        } else {
          // Fallback: combine DDL from objects
          setAllDDL(objects.map(o => o.ddl).filter(d => d).join("\n\n"))
        }
        
        toast.success("DDL generated successfully")
      } else if (result.error) {
        toast.error("Failed to generate DDL", result.error)
      }
    } catch (error) {
      toast.error("Failed to generate DDL", error instanceof Error ? error.message : "Unknown error")
    } finally {
      setIsGenerating(false)
      setLoading(false)
      setTimeout(() => setProgress(0), 1000)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Copied to clipboard")
    }).catch(() => {
      toast.error("Failed to copy")
    })
  }

  const exportSQL = () => {
    if (!allDDL && schemaObjects.length === 0) {
      toast.warning("No DDL to export", "Generate DDL first")
      return
    }

    // Build organized SQL file with headers
    const sqlContent = buildSQLFile()
    
    const blob = new Blob([sqlContent], { type: "text/sql;charset=utf-8" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    
    // Generate filename with project name and timestamp
    const projectName = project?.name || projectId || "schema"
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5)
    a.download = `${projectName}_schema_migration_${timestamp}.sql`
    
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
    toast.success("SQL file downloaded successfully")
  }

  const buildSQLFile = (): string => {
    const lines: string[] = []
    
    // File header
    lines.push("-- ================================================")
    lines.push("-- PostgreSQL Schema Migration Script")
    lines.push("-- Generated from Oracle Database")
    lines.push(`-- Project: ${project?.name || projectId || "Unknown"}`)
    lines.push(`-- Target Schema: ${targetSchema}`)
    lines.push(`-- Generated: ${new Date().toISOString()}`)
    lines.push("-- ================================================")
    lines.push("")
    lines.push("-- This script contains DDL statements for:")
    if (includeSequences) lines.push("--   - Sequences")
    if (includeIndexes) lines.push("--   - Indexes")
    if (includeConstraints) lines.push("--   - Constraints")
    if (includeViews) lines.push("--   - Views")
    lines.push("")
    lines.push("-- IMPORTANT: Review and test this script before applying to production!")
    lines.push("-- ================================================")
    lines.push("")
    lines.push("")
    
    // Organize objects by type for better organization
    const sequences = schemaObjects.filter(o => o.type === "sequence" && includeSequences)
    const indexes = schemaObjects.filter(o => o.type === "index" && includeIndexes)
    const constraints = schemaObjects.filter(o => o.type === "constraint" && includeConstraints)
    const views = schemaObjects.filter(o => o.type === "view" && includeViews)
    
    // Export sequences first (they may be needed by tables)
    if (sequences.length > 0) {
      lines.push("-- ================================================")
      lines.push(`-- SEQUENCES (${sequences.length})`)
      lines.push("-- ================================================")
      lines.push("")
      sequences.forEach((seq, index) => {
        if (seq.ddl) {
          lines.push(`-- Sequence ${index + 1}: ${seq.name}`)
          if (seq.issues && seq.issues.length > 0) {
            seq.issues.forEach(issue => {
              lines.push(`-- NOTE: ${issue}`)
            })
          }
          lines.push(seq.ddl)
          lines.push("")
        }
      })
      lines.push("")
    }
    
    // Export indexes
    if (indexes.length > 0) {
      lines.push("-- ================================================")
      lines.push(`-- INDEXES (${indexes.length})`)
      lines.push("-- ================================================")
      lines.push("")
      indexes.forEach((idx, index) => {
        if (idx.ddl) {
          lines.push(`-- Index ${index + 1}: ${idx.name}`)
          if (idx.issues && idx.issues.length > 0) {
            idx.issues.forEach(issue => {
              lines.push(`-- NOTE: ${issue}`)
            })
          }
          lines.push(idx.ddl)
          lines.push("")
        }
      })
      lines.push("")
    }
    
    // Export constraints
    if (constraints.length > 0) {
      lines.push("-- ================================================")
      lines.push(`-- CONSTRAINTS (${constraints.length})`)
      lines.push("-- ================================================")
      lines.push("")
      constraints.forEach((constraint, index) => {
        if (constraint.ddl) {
          lines.push(`-- Constraint ${index + 1}: ${constraint.name} (${constraint.type})`)
          if (constraint.issues && constraint.issues.length > 0) {
            constraint.issues.forEach(issue => {
              lines.push(`-- NOTE: ${issue}`)
            })
          }
          lines.push(constraint.ddl)
          lines.push("")
        }
      })
      lines.push("")
    }
    
    // Export views last (they may depend on tables and other objects)
    if (views.length > 0) {
      lines.push("-- ================================================")
      lines.push(`-- VIEWS (${views.length})`)
      lines.push("-- ================================================")
      lines.push("")
      views.forEach((view, index) => {
        if (view.ddl) {
          lines.push(`-- View ${index + 1}: ${view.name}`)
          if (view.issues && view.issues.length > 0) {
            view.issues.forEach(issue => {
              lines.push(`-- NOTE: ${issue}`)
            })
          }
          if (view.sourceDdl) {
            lines.push("-- Original Oracle view definition:")
            lines.push(`-- ${view.sourceDdl.split("\n").join("\n-- ")}`)
            lines.push("")
          }
          lines.push(view.ddl)
          lines.push("")
        }
      })
      lines.push("")
    }
    
    // Footer
    lines.push("-- ================================================")
    lines.push("-- End of Schema Migration Script")
    lines.push(`-- Total objects: ${schemaObjects.length}`)
    lines.push("-- ================================================")
    
    return lines.join("\n")
  }

  const getIconForType = (type: string) => {
    switch (type) {
      case "table":
        return TableIcon
      case "index":
        return LayersIcon
      case "constraint":
        return LinkIcon
      case "sequence":
        return KeyIcon
      case "view":
        return EyeIcon
      default:
        return TableIcon
    }
  }

  const getObjectsByType = (type: string) => {
    const filtered = schemaObjects.filter((o) => o.type === type)
    // Filter by include flags
    return filtered.filter(obj => {
      if (obj.type === "index" && !includeIndexes) return false
      if (obj.type === "constraint" && !includeConstraints) return false
      if (obj.type === "sequence" && !includeSequences) return false
      if (obj.type === "view" && !includeViews) return false
      return true
    })
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <div className="flex-shrink-0 p-6 pb-4">
        <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Schema Migration</h1>
          <p className="text-muted-foreground">Generate PostgreSQL DDL from Oracle schema</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => copyToClipboard(allDDL || "")}
            disabled={!allDDL || isGenerating}
          >
            <CopyIcon className="w-4 h-4 mr-2" />
            Copy All
          </Button>
          <Button 
            variant="outline"
            onClick={exportSQL}
            disabled={schemaObjects.length === 0 || isGenerating}
            title={schemaObjects.length === 0 ? "Generate DDL first to export" : "Export all DDL to SQL file"}
          >
            <DownloadIcon className="w-4 h-4 mr-2" />
            Export SQL
          </Button>
          <Button onClick={generateDDL} disabled={isGenerating || !projectId}>
            <PlayIcon className="w-4 h-4 mr-2" />
            {isGenerating ? "Generating..." : "Generate DDL"}
          </Button>
        </div>
        </div>

        {isGenerating && (
          <Card className="mt-4">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Generating DDL statements...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mt-4">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label className="pb-2">Target Schema</Label>
                <Input
                  value={targetSchema}
                  onChange={(e) => setTargetSchema(e.target.value)}
                  placeholder="public"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-4 gap-4 mt-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch id="indexes" checked={includeIndexes} onCheckedChange={setIncludeIndexes} />
                <Label htmlFor="indexes">Indexes</Label>
              </div>
              <Badge variant="outline">{getObjectsByType("index").length}</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch id="constraints" checked={includeConstraints} onCheckedChange={setIncludeConstraints} />
                <Label htmlFor="constraints">Constraints</Label>
              </div>
              <Badge variant="outline">{getObjectsByType("constraint").length}</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch id="sequences" checked={includeSequences} onCheckedChange={setIncludeSequences} />
                <Label htmlFor="sequences">Sequences</Label>
              </div>
              <Badge variant="outline">{getObjectsByType("sequence").length}</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch id="views" checked={includeViews} onCheckedChange={setIncludeViews} />
                <Label htmlFor="views">Views</Label>
              </div>
              <Badge variant="outline">{getObjectsByType("view").length}</Badge>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden px-6 pb-6 gap-6 min-h-0">
        <Card className="col-span-1 flex flex-col w-1/3 min-w-0">
          <CardHeader className="flex-shrink-0">
            <CardTitle className="text-base">Schema Objects</CardTitle>
            <CardDescription>{schemaObjects.length} objects discovered</CardDescription>
          </CardHeader>
          <CardContent className="p-0 flex-1 flex flex-col min-h-0 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
              <TabsList className="w-full rounded-none border-b flex-shrink-0">
                <TabsTrigger value="tables" className="flex-1">
                  Tables
                </TabsTrigger>
                <TabsTrigger value="indexes" className="flex-1">
                  Indexes
                </TabsTrigger>
                <TabsTrigger value="others" className="flex-1">
                  Others
                </TabsTrigger>
              </TabsList>

              <TabsContent value="tables" className="m-0 flex-1 overflow-y-auto">
                <div className="divide-y divide-border">
                  {loading ? (
                    <div className="p-8 text-center text-muted-foreground">Loading...</div>
                  ) : getObjectsByType("table").length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      No tables found. Generate DDL to discover schema objects.
                    </div>
                  ) : (
                    getObjectsByType("table").map((obj) => {
                      const Icon = getIconForType(obj.type)
                      return (
                        <button
                          key={obj.name}
                          onClick={() => setSelectedObject(obj)}
                          className={`w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors ${
                            selectedObject?.name === obj.name ? "bg-muted/50" : ""
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-muted-foreground" />
                            <span className="font-mono text-sm">{obj.name}</span>
                          </div>
                          <Badge
                            className={
                              obj.status === "generated"
                                ? "bg-success/20 text-success border-0"
                                : obj.status === "error"
                                  ? "bg-destructive/20 text-destructive border-0"
                                  : "bg-muted text-muted-foreground border-0"
                            }
                          >
                            {obj.status}
                          </Badge>
                        </button>
                      )
                    })
                  )}
                </div>
              </TabsContent>

              <TabsContent value="indexes" className="m-0 flex-1 overflow-y-auto">
                <div className="divide-y divide-border">
                  {loading ? (
                    <div className="p-8 text-center text-muted-foreground">Loading...</div>
                  ) : getObjectsByType("index").length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      {schemaObjects.length === 0 
                        ? "No indexes found. Generate DDL to discover schema objects."
                        : "No indexes found or indexes are filtered out."}
                    </div>
                  ) : (
                    getObjectsByType("index").map((obj) => {
                      const Icon = getIconForType(obj.type)
                      return (
                        <button
                          key={obj.name}
                          onClick={() => setSelectedObject(obj)}
                          className={`w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors ${
                            selectedObject?.name === obj.name ? "bg-muted/50" : ""
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-muted-foreground" />
                            <span className="font-mono text-sm">{obj.name}</span>
                          </div>
                          <Badge className="bg-success/20 text-success border-0">{obj.status}</Badge>
                        </button>
                      )
                    })
                  )}
                </div>
              </TabsContent>

              <TabsContent value="others" className="m-0 flex-1 overflow-y-auto">
                <div className="divide-y divide-border">
                  {loading ? (
                    <div className="p-8 text-center text-muted-foreground">Loading...</div>
                  ) : schemaObjects.filter((o) => !["table", "index"].includes(o.type)).length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      {schemaObjects.length === 0 
                        ? "No objects found. Generate DDL to discover schema objects."
                        : "No constraints, sequences, or views found."}
                    </div>
                  ) : (
                    schemaObjects
                      .filter((o) => !["table", "index"].includes(o.type))
                      .filter(obj => {
                        if (obj.type === "constraint" && !includeConstraints) return false
                        if (obj.type === "sequence" && !includeSequences) return false
                        if (obj.type === "view" && !includeViews) return false
                        return true
                      })
                      .map((obj) => {
                        const Icon = getIconForType(obj.type)
                        return (
                          <button
                            key={obj.name}
                            onClick={() => setSelectedObject(obj)}
                            className={`w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors ${
                              selectedObject?.name === obj.name ? "bg-muted/50" : ""
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4 text-muted-foreground" />
                              <span className="font-mono text-sm">{obj.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {obj.type}
                              </Badge>
                              <Badge
                                className={
                                  obj.status === "generated"
                                    ? "bg-success/20 text-success border-0"
                                    : "bg-muted text-muted-foreground border-0"
                                }
                              >
                                {obj.status}
                              </Badge>
                            </div>
                          </button>
                        )
                      })
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="flex flex-col flex-1 min-w-0">
          <CardHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-mono">{selectedObject?.name || "Select an object"}</CardTitle>
                {selectedObject && <CardDescription className="capitalize">{selectedObject.type} DDL</CardDescription>}
              </div>
              {selectedObject && (
                <Button variant="outline" size="sm" onClick={() => copyToClipboard(selectedObject.ddl)}>
                  <CopyIcon className="w-4 h-4 mr-2" />
                  Copy
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {selectedObject ? (
              <div className="flex flex-col flex-1 min-h-0 space-y-4">
                {selectedObject.issues && selectedObject.issues.length > 0 && (
                  <div className="flex-shrink-0 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                    <div className="flex items-center gap-2 text-warning text-sm font-medium mb-2">
                      <AlertIcon className="w-4 h-4" />
                      Conversion Notes
                    </div>
                    <ul className="text-sm text-warning/80 list-disc list-inside space-y-1">
                      {selectedObject.issues.map((issue, i) => (
                        <li key={i}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <Textarea
                  value={selectedObject.ddl}
                  onChange={(e) => {
                    setSelectedObject({ ...selectedObject, ddl: e.target.value })
                  }}
                  className="font-mono text-sm flex-1 bg-muted/30 resize-none"
                />
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                Select a schema object to view its DDL
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
