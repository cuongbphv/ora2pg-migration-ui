"use client"

import { useState } from "react"
import { Database, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiService } from "@/lib/api"
import { toast } from "@/lib/toast"
import type { Pipeline, ConnectionConfig } from "@/lib/pg-migration-types"

interface PipelineConnectionConfigProps {
    pipelineId: string
    pipeline: Pipeline
    onUpdate: () => void
}

export default function PipelineConnectionConfig({ pipelineId, pipeline, onUpdate }: PipelineConnectionConfigProps) {
    const [sourceConn, setSourceConn] = useState<ConnectionConfig>(
        pipeline.sourceConnection || {
            type: "postgresql",
            host: "",
            port: 5432,
            database: "",
            schema: "",
            username: "",
            password: "",
        }
    )
    const [targetConn, setTargetConn] = useState<ConnectionConfig>(
        pipeline.targetConnection || {
            type: "postgresql",
            host: "",
            port: 5432,
            database: "",
            schema: "",
            username: "",
            password: "",
        }
    )
    const [saving, setSaving] = useState(false)

    const handleSaveSource = async () => {
        setSaving(true)
        try {
            const result = await apiService.savePipelineConnection(pipelineId, "source", sourceConn)
            if (result.data) {
                toast.success("Source connection saved", "Source connection configuration saved successfully")
                onUpdate()
            } else if (result.error) {
                toast.error("Failed to save source connection", result.error)
            }
        } catch (error) {
            toast.error("Failed to save source connection", error instanceof Error ? error.message : "Unknown error")
        } finally {
            setSaving(false)
        }
    }

    const handleSaveTarget = async () => {
        setSaving(true)
        try {
            const result = await apiService.savePipelineConnection(pipelineId, "target", targetConn)
            if (result.data) {
                toast.success("Target connection saved", "Target connection configuration saved successfully")
                onUpdate()
            } else if (result.error) {
                toast.error("Failed to save target connection", result.error)
            }
        } catch (error) {
            toast.error("Failed to save target connection", error instanceof Error ? error.message : "Unknown error")
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-accent/30 bg-background/60 backdrop-blur-sm">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Database className="h-5 w-5 text-accent" />
                        <CardTitle>Source Connection</CardTitle>
                    </div>
                    <CardDescription>PostgreSQL source database connection</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="source-host">Host</Label>
                        <Input
                            id="source-host"
                            value={sourceConn.host}
                            onChange={(e) => setSourceConn({ ...sourceConn, host: e.target.value })}
                            placeholder="localhost"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="source-port">Port</Label>
                        <Input
                            id="source-port"
                            type="number"
                            value={sourceConn.port}
                            onChange={(e) => setSourceConn({ ...sourceConn, port: parseInt(e.target.value) || 5432 })}
                            placeholder="5432"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="source-database">Database</Label>
                        <Input
                            id="source-database"
                            value={sourceConn.database}
                            onChange={(e) => setSourceConn({ ...sourceConn, database: e.target.value })}
                            placeholder="database_name"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="source-schema">Schema</Label>
                        <Input
                            id="source-schema"
                            value={sourceConn.schema || ""}
                            onChange={(e) => setSourceConn({ ...sourceConn, schema: e.target.value })}
                            placeholder="public"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="source-username">Username</Label>
                        <Input
                            id="source-username"
                            value={sourceConn.username}
                            onChange={(e) => setSourceConn({ ...sourceConn, username: e.target.value })}
                            placeholder="postgres"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="source-password">Password</Label>
                        <Input
                            id="source-password"
                            type="password"
                            value={sourceConn.password || ""}
                            onChange={(e) => setSourceConn({ ...sourceConn, password: e.target.value })}
                            placeholder="••••••••"
                        />
                    </div>
                    <Button onClick={handleSaveSource} disabled={saving} className="w-full">
                        <Save className="mr-2 h-4 w-4" />
                        {saving ? "Saving..." : "Save Source Connection"}
                    </Button>
                </CardContent>
            </Card>

            <Card className="border-accent/30 bg-background/60 backdrop-blur-sm">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Database className="h-5 w-5 text-accent" />
                        <CardTitle>Target Connection</CardTitle>
                    </div>
                    <CardDescription>PostgreSQL target database connection</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="target-host">Host</Label>
                        <Input
                            id="target-host"
                            value={targetConn.host}
                            onChange={(e) => setTargetConn({ ...targetConn, host: e.target.value })}
                            placeholder="localhost"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="target-port">Port</Label>
                        <Input
                            id="target-port"
                            type="number"
                            value={targetConn.port}
                            onChange={(e) => setTargetConn({ ...targetConn, port: parseInt(e.target.value) || 5432 })}
                            placeholder="5432"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="target-database">Database</Label>
                        <Input
                            id="target-database"
                            value={targetConn.database}
                            onChange={(e) => setTargetConn({ ...targetConn, database: e.target.value })}
                            placeholder="database_name"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="target-schema">Schema</Label>
                        <Input
                            id="target-schema"
                            value={targetConn.schema || ""}
                            onChange={(e) => setTargetConn({ ...targetConn, schema: e.target.value })}
                            placeholder="public"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="target-username">Username</Label>
                        <Input
                            id="target-username"
                            value={targetConn.username}
                            onChange={(e) => setTargetConn({ ...targetConn, username: e.target.value })}
                            placeholder="postgres"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="target-password">Password</Label>
                        <Input
                            id="target-password"
                            type="password"
                            value={targetConn.password || ""}
                            onChange={(e) => setTargetConn({ ...targetConn, password: e.target.value })}
                            placeholder="••••••••"
                        />
                    </div>
                    <Button onClick={handleSaveTarget} disabled={saving} className="w-full">
                        <Save className="mr-2 h-4 w-4" />
                        {saving ? "Saving..." : "Save Target Connection"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}

