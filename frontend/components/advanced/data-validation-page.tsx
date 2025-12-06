"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  CheckIcon,
  AlertIcon,
  PlayIcon,
  RefreshIcon,
  DatabaseIcon,
  HashIcon,
  ClockIcon,
  TableIcon,
  SearchIcon,
  CopyIcon,
} from "@/components/icons"
import { apiService } from "@/lib/api"
import { toast } from "@/lib/toast"
import type { Project } from "@/lib/types"

interface RowCountResult {
  table: string
  sourceSchema?: string
  targetSchema?: string
  sourceCount: number
  targetCount: number
  match: boolean
  difference: number
  status?: string
  errorMessage?: string
}

interface ChecksumResult {
  table: string
  sourceSchema?: string
  targetSchema?: string
  sourceChecksum: string
  targetChecksum: string
  match: boolean
  algorithm: string
  status?: string
  errorMessage?: string
  rowCount?: number
}

interface DryRunResult {
  table: string
  sourceSchema?: string
  targetSchema?: string
  rowCount: number
  estimatedSize: string
  estimatedTime: string
  issues: string[]
  ddlPreview: string
  status?: string
  errorMessage?: string
}

interface DataValidationPageProps {
  projectId: string
  project?: Project
}

export function DataValidationPage({ projectId, project: initialProject }: DataValidationPageProps) {
  const [activeTab, setActiveTab] = useState("rowcount")
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [selectedTables, setSelectedTables] = useState<string[]>([])
  const [checksumAlgorithm, setChecksumAlgorithm] = useState("MD5")
  const [project, setProject] = useState<Project | null>(initialProject || null)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  const [rowCountResults, setRowCountResults] = useState<RowCountResult[]>([])
  const [checksumResults, setChecksumResults] = useState<ChecksumResult[]>([])
  const [dryRunResults, setDryRunResults] = useState<DryRunResult[]>([])

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
      } else if (result.error) {
        toast.error("Failed to load project", result.error)
      }
    } catch (error) {
      toast.error("Failed to load project", error instanceof Error ? error.message : "Unknown error")
    }
  }

  const runRowCountValidation = async () => {
    if (!projectId) {
      toast.error("No project selected")
      return
    }

    setIsRunning(true)
    setProgress(0)
    try {
      const tableNames = selectedTables.length > 0 ? selectedTables : undefined
      const result = await apiService.compareRowCounts(projectId, tableNames)
      
      if (result.data) {
        setRowCountResults(result.data as RowCountResult[])
        toast.success("Row count validation completed")
      } else if (result.error) {
        toast.error("Validation failed", result.error)
      }
    } catch (error) {
      toast.error("Validation failed", error instanceof Error ? error.message : "Unknown error")
    } finally {
      setIsRunning(false)
      setProgress(100)
    }
  }

  const runChecksumValidation = async () => {
    if (!projectId) {
      toast.error("No project selected")
      return
    }

    setIsRunning(true)
    setProgress(0)
    try {
      const tableNames = selectedTables.length > 0 ? selectedTables : undefined
      const result = await apiService.compareChecksums(projectId, {
        tableNames,
        algorithm: checksumAlgorithm,
      })
      
      if (result.data) {
        setChecksumResults(result.data as ChecksumResult[])
        toast.success("Checksum validation completed")
      } else if (result.error) {
        toast.error("Validation failed", result.error)
      }
    } catch (error) {
      toast.error("Validation failed", error instanceof Error ? error.message : "Unknown error")
    } finally {
      setIsRunning(false)
      setProgress(100)
    }
  }

  const runDryRun = async () => {
    if (!projectId) {
      toast.error("No project selected")
      return
    }

    setIsRunning(true)
    setProgress(0)
    try {
      const tableNames = selectedTables.length > 0 ? selectedTables : undefined
      const result = await apiService.performDryRun(projectId, tableNames)
      
      if (result.data) {
        setDryRunResults(result.data as DryRunResult[])
        toast.success("Dry-run completed")
      } else if (result.error) {
        toast.error("Dry-run failed", result.error)
      }
    } catch (error) {
      toast.error("Dry-run failed", error instanceof Error ? error.message : "Unknown error")
    } finally {
      setIsRunning(false)
      setProgress(100)
    }
  }

  const runAllValidations = async () => {
    if (!projectId) {
      toast.error("No project selected")
      return
    }

    setIsRunning(true)
    setProgress(0)
    try {
      const tableNames = selectedTables.length > 0 ? selectedTables : undefined
      const result = await apiService.runAllValidations(projectId, {
        tableNames,
        algorithm: checksumAlgorithm,
        includeDryRun: true,
      })
      
      if (result.data) {
        const data = result.data as any
        if (data.rowCount) setRowCountResults(data.rowCount)
        if (data.checksum) setChecksumResults(data.checksum)
        if (data.dryRun) setDryRunResults(data.dryRun)
        toast.success("All validations completed")
      } else if (result.error) {
        toast.error("Validation failed", result.error)
      }
    } catch (error) {
      toast.error("Validation failed", error instanceof Error ? error.message : "Unknown error")
    } finally {
      setIsRunning(false)
      setProgress(100)
    }
  }

  const handleRunValidation = () => {
    if (activeTab === "rowcount") {
      runRowCountValidation()
    } else if (activeTab === "checksum") {
      runChecksumValidation()
    } else if (activeTab === "dryrun") {
      runDryRun()
    }
  }

  const availableTables = project?.tableMappings?.map(tm => tm.sourceTable) || []

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Copied to clipboard")
    }).catch(() => {
      toast.error("Failed to copy")
    })
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Data Validation</h1>
          <p className="text-muted-foreground">Validate data integrity between Oracle source and PostgreSQL target</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => {
            setRowCountResults([])
            setChecksumResults([])
            setDryRunResults([])
            setProgress(0)
          }}>
            <RefreshIcon className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleRunValidation} disabled={isRunning || !projectId}>
            <PlayIcon className="w-4 h-4 mr-2" />
            {isRunning ? "Running..." : "Run Validation"}
          </Button>
        </div>
      </div>

      {isRunning && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Validating tables...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rowcount" className="flex items-center gap-2">
            <HashIcon className="w-4 h-4" />
            Row Count
          </TabsTrigger>
          <TabsTrigger value="checksum" className="flex items-center gap-2">
            <DatabaseIcon className="w-4 h-4" />
            Checksum
          </TabsTrigger>
          <TabsTrigger value="dryrun" className="flex items-center gap-2">
            <ClockIcon className="w-4 h-4" />
            Dry-Run
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rowcount" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Row Count Comparison</CardTitle>
              <CardDescription>Compare row counts between source and target tables</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Label className="pb-2">Select Tables</Label>
                    <Select
                      value={selectedTables.length === 0 ? "all" : "selected"}
                      onValueChange={(value) => {
                        if (value === "all") {
                          setSelectedTables([])
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All tables" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Tables</SelectItem>
                        {availableTables.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Label className="pb-2">Filter</Label>
                    <div className="relative">
                      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        placeholder="Search tables..." 
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 text-sm font-medium">Table</th>
                        <th className="text-right p-3 text-sm font-medium">Source Count</th>
                        <th className="text-right p-3 text-sm font-medium">Target Count</th>
                        <th className="text-right p-3 text-sm font-medium">Difference</th>
                        <th className="text-center p-3 text-sm font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {rowCountResults.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-muted-foreground">
                            {loading ? "Loading..." : "No validation results. Click 'Run Validation' to start."}
                          </td>
                        </tr>
                      ) : (
                        rowCountResults
                          .filter(r => !searchTerm || r.table.toLowerCase().includes(searchTerm.toLowerCase()))
                          .map((result) => (
                            <tr key={result.table} className="hover:bg-muted/30">
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <TableIcon className="w-4 h-4 text-muted-foreground" />
                                  <span className="font-mono text-sm">{result.table}</span>
                                </div>
                              </td>
                              <td className="p-3 text-right font-mono text-sm">
                                {result.sourceCount?.toLocaleString() ?? "N/A"}
                              </td>
                              <td className="p-3 text-right font-mono text-sm">
                                {result.targetCount?.toLocaleString() ?? "N/A"}
                              </td>
                              <td className="p-3 text-right font-mono text-sm">
                                {result.difference !== 0 && result.difference != null && (
                                  <span className={result.difference > 0 ? "text-destructive" : "text-muted-foreground"}>
                                    {result.difference > 0 ? "+" : ""}{result.difference}
                                  </span>
                                )}
                                {result.difference === 0 && <span className="text-muted-foreground">0</span>}
                                {result.difference == null && <span className="text-muted-foreground">-</span>}
                              </td>
                              <td className="p-3 text-center">
                                {result.status === "error" ? (
                                  <Badge variant="destructive">
                                    <AlertIcon className="w-3 h-3 mr-1" />
                                    Error
                                  </Badge>
                                ) : result.match ? (
                                  <Badge className="bg-success/20 text-success border-0">
                                    <CheckIcon className="w-3 h-3 mr-1" />
                                    Match
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive">
                                    <AlertIcon className="w-3 h-3 mr-1" />
                                    Mismatch
                                  </Badge>
                                )}
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    {rowCountResults.filter((r) => r.match).length} of {rowCountResults.length} tables match
                  </span>
                  <span>Total rows: {rowCountResults.reduce((a, b) => a + b.sourceCount, 0).toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checksum" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Checksum Validation</CardTitle>
              <CardDescription>Verify data integrity using cryptographic checksums</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-48">
                    <Label className="pb-2">Algorithm</Label>
                    <Select value={checksumAlgorithm} onValueChange={setChecksumAlgorithm}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MD5">MD5</SelectItem>
                        <SelectItem value="SHA256">SHA-256</SelectItem>
                        <SelectItem value="SHA512">SHA-512</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Label className="pb-2">Columns to Include</Label>
                    <Input placeholder="* (all columns)" />
                  </div>
                </div>

                <div className="border rounded-lg overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                    <thead className="bg-muted/50 sticky top-0 z-10">
                      <tr>
                        <th className="text-left p-3 text-sm font-medium min-w-[150px] sticky left-0 bg-muted/50 z-20">Table</th>
                        <th className="text-left p-3 text-sm font-medium min-w-[250px]">Source Checksum</th>
                        <th className="text-left p-3 text-sm font-medium min-w-[250px]">Target Checksum</th>
                        <th className="text-center p-3 text-sm font-medium min-w-[100px]">Algorithm</th>
                        <th className="text-center p-3 text-sm font-medium min-w-[100px]">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {checksumResults.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-muted-foreground">
                            {loading ? "Loading..." : "No validation results. Click 'Run Validation' to start."}
                          </td>
                        </tr>
                      ) : (
                        checksumResults
                          .filter(r => !searchTerm || r.table.toLowerCase().includes(searchTerm.toLowerCase()))
                          .map((result) => (
                            <tr key={result.table} className="hover:bg-muted/30">
                              <td className="p-3 sticky left-0 bg-background z-10">
                                <div className="flex items-center gap-2">
                                  <TableIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                                  <span className="font-mono text-sm whitespace-nowrap">{result.table}</span>
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="flex items-start gap-2 group">
                                  <div className="font-mono text-xs text-muted-foreground break-all break-words flex-1 min-w-0 max-w-full">
                                    <span className="whitespace-pre-wrap">{result.sourceChecksum || "N/A"}</span>
                                  </div>
                                  {result.sourceChecksum && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                      onClick={() => copyToClipboard(result.sourceChecksum || "")}
                                      title="Copy checksum"
                                    >
                                      <CopyIcon className="w-3 h-3" />
                                    </Button>
                                  )}
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="flex items-start gap-2 group">
                                  <div className="font-mono text-xs text-muted-foreground break-all break-words flex-1 min-w-0 max-w-full">
                                    <span className="whitespace-pre-wrap">{result.targetChecksum || "N/A"}</span>
                                  </div>
                                  {result.targetChecksum && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                      onClick={() => copyToClipboard(result.targetChecksum || "")}
                                      title="Copy checksum"
                                    >
                                      <CopyIcon className="w-3 h-3" />
                                    </Button>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 text-center">
                                <Badge variant="outline">{result.algorithm}</Badge>
                              </td>
                              <td className="p-3 text-center">
                                {result.status === "error" ? (
                                  <Badge variant="destructive">Error</Badge>
                                ) : result.match ? (
                                  <Badge className="bg-success/20 text-success border-0">Valid</Badge>
                                ) : (
                                  <Badge variant="destructive">Invalid</Badge>
                                )}
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dryrun" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dry-Run Simulation</CardTitle>
              <CardDescription>Preview migration without making actual changes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dryRunResults.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="pt-6 text-center text-muted-foreground">
                      {loading ? "Loading..." : "No dry-run results. Click 'Run Validation' to start."}
                    </CardContent>
                  </Card>
                ) : (
                  dryRunResults
                    .filter(r => !searchTerm || r.table.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((result) => (
                  <Card key={result.table} className="border-border/50">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-mono">{result.table}</CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{result.rowCount.toLocaleString()} rows</Badge>
                          <Badge variant="outline">{result.estimatedSize}</Badge>
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                            <ClockIcon className="w-3 h-3 mr-1" />
                            {result.estimatedTime}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {result.issues.length > 0 && (
                        <div className="space-y-1">
                          <Label className="text-xs text-warning">Potential Issues</Label>
                          {result.issues.map((issue, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm text-warning">
                              <AlertIcon className="w-4 h-4" />
                              {issue}
                            </div>
                          ))}
                        </div>
                      )}
                      <div>
                        <Label className="text-xs text-muted-foreground">DDL Preview</Label>
                        <pre className="mt-1 p-3 bg-muted/50 rounded-md text-xs font-mono overflow-x-auto">
                          {result.ddlPreview}
                        </pre>
                      </div>
                    </CardContent>
                  </Card>
                    ))
                )}

                {dryRunResults.length > 0 && (
                  <Card className="bg-muted/30 border-dashed">
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-foreground">{dryRunResults.length}</div>
                        <div className="text-xs text-muted-foreground">Tables</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-foreground">
                          {dryRunResults.reduce((a, b) => a + b.rowCount, 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">Total Rows</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-foreground">1.25 GB</div>
                        <div className="text-xs text-muted-foreground">Estimated Size</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-foreground">~48m</div>
                        <div className="text-xs text-muted-foreground">Estimated Time</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
