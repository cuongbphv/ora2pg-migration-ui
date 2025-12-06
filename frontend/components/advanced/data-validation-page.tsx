"use client"

import { useState } from "react"
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
} from "@/components/icons"

interface RowCountResult {
  table: string
  sourceCount: number
  targetCount: number
  match: boolean
  difference: number
}

interface ChecksumResult {
  table: string
  sourceChecksum: string
  targetChecksum: string
  match: boolean
  algorithm: string
}

interface DryRunResult {
  table: string
  rowCount: number
  estimatedSize: string
  estimatedTime: string
  issues: string[]
  ddlPreview: string
}

export function DataValidationPage() {
  const [activeTab, setActiveTab] = useState("rowcount")
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [selectedTables, setSelectedTables] = useState<string[]>([])
  const [checksumAlgorithm, setChecksumAlgorithm] = useState("md5")

  // Mock data
  const [rowCountResults, setRowCountResults] = useState<RowCountResult[]>([
    { table: "EMPLOYEES", sourceCount: 107500, targetCount: 107500, match: true, difference: 0 },
    { table: "DEPARTMENTS", sourceCount: 27, targetCount: 27, match: true, difference: 0 },
    { table: "ORDERS", sourceCount: 2843567, targetCount: 2843560, match: false, difference: 7 },
    { table: "CUSTOMERS", sourceCount: 150000, targetCount: 150000, match: true, difference: 0 },
    { table: "PRODUCTS", sourceCount: 8500, targetCount: 8500, match: true, difference: 0 },
  ])

  const [checksumResults, setChecksumResults] = useState<ChecksumResult[]>([
    {
      table: "EMPLOYEES",
      sourceChecksum: "a1b2c3d4e5f6",
      targetChecksum: "a1b2c3d4e5f6",
      match: true,
      algorithm: "MD5",
    },
    {
      table: "DEPARTMENTS",
      sourceChecksum: "f6e5d4c3b2a1",
      targetChecksum: "f6e5d4c3b2a1",
      match: true,
      algorithm: "MD5",
    },
    { table: "ORDERS", sourceChecksum: "1a2b3c4d5e6f", targetChecksum: "1a2b3c4d5e6g", match: false, algorithm: "MD5" },
  ])

  const [dryRunResults, setDryRunResults] = useState<DryRunResult[]>([
    {
      table: "EMPLOYEES",
      rowCount: 107500,
      estimatedSize: "45 MB",
      estimatedTime: "2m 30s",
      issues: [],
      ddlPreview: "CREATE TABLE employees (\n  id SERIAL PRIMARY KEY,\n  name VARCHAR(100),\n  email VARCHAR(255)\n);",
    },
    {
      table: "ORDERS",
      rowCount: 2843567,
      estimatedSize: "1.2 GB",
      estimatedTime: "45m 20s",
      issues: ["Large table - consider batch migration", "INDEX on order_date may take additional 5m"],
      ddlPreview: "CREATE TABLE orders (\n  id SERIAL PRIMARY KEY,\n  customer_id INTEGER,\n  order_date TIMESTAMP\n);",
    },
  ])

  const runValidation = () => {
    setIsRunning(true)
    setProgress(0)
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsRunning(false)
          return 100
        }
        return prev + 10
      })
    }, 500)
  }

  const availableTables = ["EMPLOYEES", "DEPARTMENTS", "ORDERS", "CUSTOMERS", "PRODUCTS", "INVENTORY", "SUPPLIERS"]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Data Validation</h1>
          <p className="text-muted-foreground">Validate data integrity between Oracle source and PostgreSQL target</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setProgress(0)}>
            <RefreshIcon className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button onClick={runValidation} disabled={isRunning}>
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
                    <Label>Select Tables</Label>
                    <Select>
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
                    <Label>Filter</Label>
                    <div className="relative">
                      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="Search tables..." className="pl-9" />
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
                      {rowCountResults.map((result) => (
                        <tr key={result.table} className="hover:bg-muted/30">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <TableIcon className="w-4 h-4 text-muted-foreground" />
                              <span className="font-mono text-sm">{result.table}</span>
                            </div>
                          </td>
                          <td className="p-3 text-right font-mono text-sm">{result.sourceCount.toLocaleString()}</td>
                          <td className="p-3 text-right font-mono text-sm">{result.targetCount.toLocaleString()}</td>
                          <td className="p-3 text-right font-mono text-sm">
                            {result.difference !== 0 && <span className="text-destructive">-{result.difference}</span>}
                            {result.difference === 0 && <span className="text-muted-foreground">0</span>}
                          </td>
                          <td className="p-3 text-center">
                            {result.match ? (
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
                      ))}
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
                    <Label>Algorithm</Label>
                    <Select value={checksumAlgorithm} onValueChange={setChecksumAlgorithm}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="md5">MD5</SelectItem>
                        <SelectItem value="sha256">SHA-256</SelectItem>
                        <SelectItem value="sha512">SHA-512</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Label>Columns to Include</Label>
                    <Input placeholder="* (all columns)" />
                  </div>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 text-sm font-medium">Table</th>
                        <th className="text-left p-3 text-sm font-medium">Source Checksum</th>
                        <th className="text-left p-3 text-sm font-medium">Target Checksum</th>
                        <th className="text-center p-3 text-sm font-medium">Algorithm</th>
                        <th className="text-center p-3 text-sm font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {checksumResults.map((result) => (
                        <tr key={result.table} className="hover:bg-muted/30">
                          <td className="p-3 font-mono text-sm">{result.table}</td>
                          <td className="p-3 font-mono text-xs text-muted-foreground">{result.sourceChecksum}</td>
                          <td className="p-3 font-mono text-xs text-muted-foreground">{result.targetChecksum}</td>
                          <td className="p-3 text-center">
                            <Badge variant="outline">{result.algorithm}</Badge>
                          </td>
                          <td className="p-3 text-center">
                            {result.match ? (
                              <Badge className="bg-success/20 text-success border-0">Valid</Badge>
                            ) : (
                              <Badge variant="destructive">Invalid</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
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
                {dryRunResults.map((result) => (
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
                ))}

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
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
