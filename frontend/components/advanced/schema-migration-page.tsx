"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AlertIcon, PlayIcon, DownloadIcon, CopyIcon, TableIcon, KeyIcon, LinkIcon, LayersIcon, EyeIcon } from "@/components/icons"

interface SchemaObject {
  name: string
  type: "table" | "index" | "constraint" | "sequence" | "view"
  status: "pending" | "generated" | "applied" | "error"
  ddl: string
  issues?: string[]
}

export function SchemaMigrationPage() {
  const [activeTab, setActiveTab] = useState("tables")
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [includeIndexes, setIncludeIndexes] = useState(true)
  const [includeConstraints, setIncludeConstraints] = useState(true)
  const [includeSequences, setIncludeSequences] = useState(true)
  const [includeViews, setIncludeViews] = useState(true)

  const [schemaObjects, setSchemaObjects] = useState<SchemaObject[]>([
    {
      name: "EMPLOYEES",
      type: "table",
      status: "generated",
      ddl: `CREATE TABLE employees (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  email VARCHAR(100) UNIQUE,
  hire_date DATE,
  salary NUMERIC(10,2),
  department_id INTEGER
);`,
    },
    {
      name: "DEPARTMENTS",
      type: "table",
      status: "generated",
      ddl: `CREATE TABLE departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  location VARCHAR(100),
  manager_id INTEGER
);`,
    },
    {
      name: "idx_employees_email",
      type: "index",
      status: "generated",
      ddl: "CREATE INDEX idx_employees_email ON employees(email);",
    },
    {
      name: "idx_employees_dept",
      type: "index",
      status: "generated",
      ddl: "CREATE INDEX idx_employees_dept ON employees(department_id);",
    },
    {
      name: "fk_employees_dept",
      type: "constraint",
      status: "generated",
      ddl: "ALTER TABLE employees ADD CONSTRAINT fk_employees_dept FOREIGN KEY (department_id) REFERENCES departments(id);",
    },
    {
      name: "employees_seq",
      type: "sequence",
      status: "generated",
      ddl: "CREATE SEQUENCE employees_seq START 1 INCREMENT 1;",
    },
    {
      name: "v_employee_details",
      type: "view",
      status: "pending",
      ddl: `CREATE VIEW v_employee_details AS
SELECT e.*, d.name as department_name
FROM employees e
LEFT JOIN departments d ON e.department_id = d.id;`,
      issues: ["Contains Oracle-specific DECODE function - converted to CASE WHEN"],
    },
  ])

  const [selectedObject, setSelectedObject] = useState<SchemaObject | null>(schemaObjects[0])

  const generateDDL = () => {
    setIsGenerating(true)
    setProgress(0)
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsGenerating(false)
          return 100
        }
        return prev + 5
      })
    }, 200)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
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

  const getObjectsByType = (type: string) => schemaObjects.filter((o) => o.type === type)

  const allDDL = schemaObjects.map((o) => o.ddl).join("\n\n")

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Schema Migration</h1>
          <p className="text-muted-foreground">Generate PostgreSQL DDL from Oracle schema</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => copyToClipboard(allDDL)}>
            <CopyIcon className="w-4 h-4 mr-2" />
            Copy All
          </Button>
          <Button variant="outline">
            <DownloadIcon className="w-4 h-4 mr-2" />
            Export SQL
          </Button>
          <Button onClick={generateDDL} disabled={isGenerating}>
            <PlayIcon className="w-4 h-4 mr-2" />
            {isGenerating ? "Generating..." : "Generate DDL"}
          </Button>
        </div>
      </div>

      {isGenerating && (
        <Card>
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

      <div className="grid grid-cols-4 gap-4">
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

      <div className="grid grid-cols-3 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Schema Objects</CardTitle>
            <CardDescription>{schemaObjects.length} objects discovered</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full rounded-none border-b">
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

              <TabsContent value="tables" className="m-0">
                <div className="divide-y divide-border">
                  {getObjectsByType("table").map((obj) => {
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
                  })}
                </div>
              </TabsContent>

              <TabsContent value="indexes" className="m-0">
                <div className="divide-y divide-border">
                  {getObjectsByType("index").map((obj) => {
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
                  })}
                </div>
              </TabsContent>

              <TabsContent value="others" className="m-0">
                <div className="divide-y divide-border">
                  {schemaObjects
                    .filter((o) => !["table", "index"].includes(o.type))
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
                    })}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="col-span-2">
          <CardHeader>
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
          <CardContent>
            {selectedObject ? (
              <div className="space-y-4">
                {selectedObject.issues && selectedObject.issues.length > 0 && (
                  <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
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
                  className="font-mono text-sm h-80 bg-muted/30"
                />
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center text-muted-foreground">
                Select a schema object to view its DDL
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
