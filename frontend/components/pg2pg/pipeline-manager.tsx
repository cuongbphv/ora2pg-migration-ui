"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PlayIcon, PauseIcon, SettingsIcon, PlusIcon, CalendarIcon, PostgresIcon } from "../icons"
import type { Pipeline } from "@/lib/pg-migration-types"
import type { ConnectionConfig } from "@/lib/types"

interface PipelineManagerProps {
  projectId: string
  pipelines?: Pipeline[]
  onCreatePipeline?: (pipeline: Pipeline) => void
  onUpdatePipeline?: (pipeline: Pipeline) => void
}

export function PipelineManager({
  projectId,
  pipelines,
  onCreatePipeline,
  onUpdatePipeline,
}: PipelineManagerProps) {
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null)
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false)
  const [tempSourceConnection, setTempSourceConnection] = useState<ConnectionConfig | undefined>()
  const [tempTargetConnection, setTempTargetConnection] = useState<ConnectionConfig | undefined>()

  const handleConfigConnections = (pipeline: Pipeline) => {
    setSelectedPipeline(pipeline)
    setTempSourceConnection(pipeline?.sourceConnection)
    setTempTargetConnection(pipeline?.targetConnection)
    setIsConfigDialogOpen(true)
  }

  const handleSaveConnections = () => {
    if (selectedPipeline && tempSourceConnection && tempTargetConnection && onUpdatePipeline) {
      onUpdatePipeline({
        ...selectedPipeline,
        sourceConnection: tempSourceConnection,
        targetConnection: tempTargetConnection,
      })
      setIsConfigDialogOpen(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-success/20 text-success"
      case "completed":
        return "bg-primary/20 text-primary"
      case "error":
        return "bg-destructive/20 text-destructive"
      case "paused":
        return "bg-warning/20 text-warning"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pipeline Management</h1>
          <p className="text-muted-foreground">PostgreSQL to PostgreSQL data migration pipelines</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="w-4 h-4 mr-2" />
              New Pipeline
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Pipeline</DialogTitle>
              <DialogDescription>Create a new data migration pipeline</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pipeline-name">Pipeline Name</Label>
                <Input id="pipeline-name" placeholder="e.g., Customer Migration" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pipeline-desc">Description</Label>
                <Input id="pipeline-desc" placeholder="Pipeline description" />
              </div>
              <Button className="w-full">Create Pipeline</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pipeline List Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Active Pipelines</CardTitle>
          <CardDescription>Total: {pipelines.length} pipelines</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pipeline Name</TableHead>
                  <TableHead>Total Steps</TableHead>
                  <TableHead>Total Runs</TableHead>
                  <TableHead>Last Run</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pipelines.map((pipeline) => (
                  <TableRow key={pipeline.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span className="text-foreground">{pipeline.name}</span>
                        {pipeline.description && (
                          <span className="text-xs text-muted-foreground">{pipeline.description}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{pipeline?.steps?.length} steps</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{pipeline.totalRuns} runs</Badge>
                    </TableCell>
                    <TableCell>
                      {pipeline?.lastRunAt ? (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <CalendarIcon className="w-4 h-4" />
                          {new Date(pipeline?.lastRunAt).toLocaleDateString()}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(pipeline.status)}>{pipeline.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {pipeline?.status === "active" ? (
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <PauseIcon className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <PlayIcon className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleConfigConnections(pipeline)}
                        >
                          <SettingsIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Dialog */}
      <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configure Pipeline: {selectedPipeline?.name}</DialogTitle>
            <DialogDescription>Configure source and target PostgreSQL connections for this pipeline</DialogDescription>
          </DialogHeader>

          {selectedPipeline && tempSourceConnection && tempTargetConnection && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Source PostgreSQL */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-border">
                    <PostgresIcon className="w-5 h-5 text-postgres" />
                    <h3 className="font-semibold text-foreground">Source Database</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-sm">Host</Label>
                      <Input
                        value={tempSourceConnection.host}
                        onChange={(e) =>
                          setTempSourceConnection({
                            ...tempSourceConnection,
                            host: e.target.value,
                          })
                        }
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Port</Label>
                      <Input
                        type="number"
                        value={tempSourceConnection.port}
                        onChange={(e) =>
                          setTempSourceConnection({
                            ...tempSourceConnection,
                            port: Number.parseInt(e.target.value),
                          })
                        }
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Database</Label>
                      <Input
                        value={tempSourceConnection.database}
                        onChange={(e) =>
                          setTempSourceConnection({
                            ...tempSourceConnection,
                            database: e.target.value,
                          })
                        }
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Schema</Label>
                      <Input
                        value={tempSourceConnection.schema}
                        onChange={(e) =>
                          setTempSourceConnection({
                            ...tempSourceConnection,
                            schema: e.target.value,
                          })
                        }
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Username</Label>
                      <Input
                        value={tempSourceConnection.username}
                        onChange={(e) =>
                          setTempSourceConnection({
                            ...tempSourceConnection,
                            username: e.target.value,
                          })
                        }
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Password</Label>
                      <Input
                        type="password"
                        value={tempSourceConnection.password}
                        onChange={(e) =>
                          setTempSourceConnection({
                            ...tempSourceConnection,
                            password: e.target.value,
                          })
                        }
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Target PostgreSQL */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-border">
                    <PostgresIcon className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-foreground">Target Database</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-sm">Host</Label>
                      <Input
                        value={tempTargetConnection.host}
                        onChange={(e) =>
                          setTempTargetConnection({
                            ...tempTargetConnection,
                            host: e.target.value,
                          })
                        }
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Port</Label>
                      <Input
                        type="number"
                        value={tempTargetConnection.port}
                        onChange={(e) =>
                          setTempTargetConnection({
                            ...tempTargetConnection,
                            port: Number.parseInt(e.target.value),
                          })
                        }
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Database</Label>
                      <Input
                        value={tempTargetConnection.database}
                        onChange={(e) =>
                          setTempTargetConnection({
                            ...tempTargetConnection,
                            database: e.target.value,
                          })
                        }
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Schema</Label>
                      <Input
                        value={tempTargetConnection.schema}
                        onChange={(e) =>
                          setTempTargetConnection({
                            ...tempTargetConnection,
                            schema: e.target.value,
                          })
                        }
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Username</Label>
                      <Input
                        value={tempTargetConnection.username}
                        onChange={(e) =>
                          setTempTargetConnection({
                            ...tempTargetConnection,
                            username: e.target.value,
                          })
                        }
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Password</Label>
                      <Input
                        type="password"
                        value={tempTargetConnection.password}
                        onChange={(e) =>
                          setTempTargetConnection({
                            ...tempTargetConnection,
                            password: e.target.value,
                          })
                        }
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-border">
                <Button variant="outline" onClick={() => setIsConfigDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveConnections}>Save Configuration</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
