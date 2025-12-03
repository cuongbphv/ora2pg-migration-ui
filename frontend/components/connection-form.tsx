"use client"

import {useState} from "react"
import type {ConnectionConfig} from "@/lib/types"
import {apiService} from "@/lib/api"
import {toast} from "@/lib/toast"
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card"
import {Button} from "@/components/ui/button"
import {Input} from "@/components/ui/input"
import {Label} from "@/components/ui/label"
import {OracleIcon, PostgresIcon, CheckIcon, RefreshIcon} from "./icons"

interface ConnectionFormProps {
    sourceConnection?: ConnectionConfig
    targetConnection?: ConnectionConfig
    onSaveSource: (config: ConnectionConfig) => void
    onSaveTarget: (config: ConnectionConfig) => void
}

export function ConnectionForm({
                                   sourceConnection,
                                   targetConnection,
                                   onSaveSource,
                                   onSaveTarget,
                               }: ConnectionFormProps) {
    const [source, setSource] = useState<Partial<ConnectionConfig>>(
        sourceConnection || {
            type: "oracle",
            host: "",
            port: 1521,
            database: "",
            schema: "",
            username: "",
            password: "",
        },
    )

    const [target, setTarget] = useState<Partial<ConnectionConfig>>(
        targetConnection || {
            type: "postgresql",
            host: "",
            port: 5432,
            database: "",
            schema: "public",
            username: "",
            password: "",
        },
    )

    const [testingSource, setTestingSource] = useState(false)
    const [testingTarget, setTestingTarget] = useState(false)
    const [sourceConnected, setSourceConnected] = useState(sourceConnection?.isConnected || false)
    const [targetConnected, setTargetConnected] = useState(targetConnection?.isConnected || false)

    const handleTestSource = async () => {
        setTestingSource(true)
        try {
            const result = await apiService.testConnection(source as ConnectionConfig)
            if (result.data?.success) {
                setSourceConnected(true)
                setSource({...source, isConnected: true, connectionString: result.data?.connectionString});
                toast.success("Connection successful", `Connected to ${source.host} in ${result.data.connectionTimeMs}ms`)
            } else {
                setSourceConnected(false)
                setSource({...source, isConnected: false, connectionString: result.data?.connectionString});
                toast.error("Connection failed", result.data?.message || "Please check your connection settings")
            }
        } catch (error) {
            setSourceConnected(false)
            setSource({...source, isConnected: false, connectionString: ''});
            toast.error("Connection test failed", "Please check your connection settings and try again")
        } finally {
            setTestingSource(false)
        }
    }

    const handleTestTarget = async () => {
        setTestingTarget(true)
        try {
            const result = await apiService.testConnection(target as ConnectionConfig)
            if (result.data?.success) {
                setTargetConnected(true)
                setTarget({...target, isConnected: true, connectionString: result.data?.connectionString});
                toast.success("Connection successful", `Connected to ${target.host} in ${result.data.connectionTimeMs}ms`)
            } else {
                setTargetConnected(false)
                setTarget({...target, isConnected: false, connectionString: result.data?.connectionString});
                toast.error("Connection failed", result.data?.message || "Please check your connection settings")
            }
        } catch (error) {
            setTargetConnected(false)
            setTarget({...target, isConnected: false, connectionString: ''});
            toast.error("Connection test failed", "Please check your connection settings and try again")
        } finally {
            setTestingTarget(false)
        }
    }

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Database Connections</h1>
                <p className="text-muted-foreground">Configure source and target database connections</p>
            </div>

            <div className="grid grid-cols-2 gap-6">
                {/* Oracle Source */}
                <Card className="bg-card border-border">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <OracleIcon className="w-6 h-6 text-oracle"/>
                                <CardTitle>Oracle Source</CardTitle>
                            </div>
                            {sourceConnected && (
                                <span className="flex items-center gap-1 text-xs text-success">
                  <CheckIcon className="w-3 h-3"/>
                  Connected
                </span>
                            )}
                        </div>
                        <CardDescription>Configure Oracle database connection</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="source-host">Host</Label>
                                <Input
                                    id="source-host"
                                    placeholder="oracle.example.com"
                                    value={source.host}
                                    onChange={(e) => setSource({...source, host: e.target.value})}
                                    className="bg-input border-border"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="source-port">Port</Label>
                                <Input
                                    id="source-port"
                                    type="number"
                                    placeholder="1521"
                                    value={source.port}
                                    onChange={(e) => setSource({...source, port: Number.parseInt(e.target.value)})}
                                    className="bg-input border-border"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="source-database">Service Name / SID</Label>
                            <Input
                                id="source-database"
                                placeholder="ORCL"
                                value={source.database}
                                onChange={(e) => setSource({...source, database: e.target.value})}
                                className="bg-input border-border"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="source-schema">Schema</Label>
                            <Input
                                id="source-schema"
                                placeholder="HR"
                                value={source.schema}
                                onChange={(e) => setSource({...source, schema: e.target.value})}
                                className="bg-input border-border"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="source-username">Username</Label>
                                <Input
                                    id="source-username"
                                    placeholder="admin"
                                    value={source.username}
                                    onChange={(e) => setSource({...source, username: e.target.value})}
                                    className="bg-input border-border"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="source-password">Password</Label>
                                <Input
                                    id="source-password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={source.password}
                                    onChange={(e) => setSource({...source, password: e.target.value})}
                                    className="bg-input border-border"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button
                                variant="outline"
                                className="flex-1 bg-transparent"
                                onClick={handleTestSource}
                                disabled={testingSource}
                            >
                                {testingSource ? (
                                    <>
                                        <RefreshIcon className="w-4 h-4 mr-2 animate-spin"/>
                                        Testing...
                                    </>
                                ) : (
                                    "Test Connection"
                                )}
                            </Button>
                            <Button className="flex-1" onClick={() => onSaveSource(source as ConnectionConfig)}>
                                Save
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* PostgreSQL Target */}
                <Card className="bg-card border-border">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <PostgresIcon className="w-6 h-6 text-postgres"/>
                                <CardTitle>PostgreSQL Target</CardTitle>
                            </div>
                            {targetConnected && (
                                <span className="flex items-center gap-1 text-xs text-success">
                  <CheckIcon className="w-3 h-3"/>
                  Connected
                </span>
                            )}
                        </div>
                        <CardDescription>Configure PostgreSQL database connection</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="target-host">Host</Label>
                                <Input
                                    id="target-host"
                                    placeholder="postgres.example.com"
                                    value={target.host}
                                    onChange={(e) => setTarget({...target, host: e.target.value})}
                                    className="bg-input border-border"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="target-port">Port</Label>
                                <Input
                                    id="target-port"
                                    type="number"
                                    placeholder="5432"
                                    value={target.port}
                                    onChange={(e) => setTarget({...target, port: Number.parseInt(e.target.value)})}
                                    className="bg-input border-border"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="target-database">Database</Label>
                            <Input
                                id="target-database"
                                placeholder="mydb"
                                value={target.database}
                                onChange={(e) => setTarget({...target, database: e.target.value})}
                                className="bg-input border-border"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="target-schema">Schema</Label>
                            <Input
                                id="target-schema"
                                placeholder="public"
                                value={target.schema}
                                onChange={(e) => setTarget({...target, schema: e.target.value})}
                                className="bg-input border-border"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="target-username">Username</Label>
                                <Input
                                    id="target-username"
                                    placeholder="postgres"
                                    value={target.username}
                                    onChange={(e) => setTarget({...target, username: e.target.value})}
                                    className="bg-input border-border"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="target-password">Password</Label>
                                <Input
                                    id="target-password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={target.password}
                                    onChange={(e) => setTarget({...target, password: e.target.value})}
                                    className="bg-input border-border"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button
                                variant="outline"
                                className="flex-1 bg-transparent"
                                onClick={handleTestTarget}
                                disabled={testingTarget}
                            >
                                {testingTarget ? (
                                    <>
                                        <RefreshIcon className="w-4 h-4 mr-2 animate-spin"/>
                                        Testing...
                                    </>
                                ) : (
                                    "Test Connection"
                                )}
                            </Button>
                            <Button className="flex-1" onClick={() => onSaveTarget(target as ConnectionConfig)}>
                                Save
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
