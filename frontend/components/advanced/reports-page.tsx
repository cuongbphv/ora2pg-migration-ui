"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { FileTextIcon, DownloadIcon, MailIcon, CalendarIcon, PlayIcon, EyeIcon, TrashIcon } from "@/components/icons"

interface Report {
  id: string
  name: string
  type: "pdf" | "html" | "csv" | "json"
  projectName: string
  generatedAt: Date
  size: string
  status: "completed" | "generating" | "failed"
}

interface ScheduledReport {
  id: string
  name: string
  type: "pdf" | "html"
  frequency: string
  recipients: string[]
  enabled: boolean
  lastGenerated: Date | null
  nextGeneration: Date
}

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState("generated")
  const [showNewReportDialog, setShowNewReportDialog] = useState(false)
  const [showScheduleDialog, setShowScheduleDialog] = useState(false)

  const [reports, setReports] = useState<Report[]>([
    {
      id: "1",
      name: "ERP Migration Summary",
      type: "pdf",
      projectName: "ERP Migration",
      generatedAt: new Date(Date.now() - 3600000),
      size: "2.4 MB",
      status: "completed",
    },
    {
      id: "2",
      name: "Data Validation Report",
      type: "html",
      projectName: "ERP Migration",
      generatedAt: new Date(Date.now() - 7200000),
      size: "1.1 MB",
      status: "completed",
    },
    {
      id: "3",
      name: "Performance Analytics",
      type: "pdf",
      projectName: "ERP Migration",
      generatedAt: new Date(Date.now() - 86400000),
      size: "3.8 MB",
      status: "completed",
    },
    {
      id: "4",
      name: "Schema Comparison",
      type: "csv",
      projectName: "Legacy Data",
      generatedAt: new Date(Date.now() - 172800000),
      size: "450 KB",
      status: "completed",
    },
  ])

  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([
    {
      id: "1",
      name: "Weekly Migration Summary",
      type: "pdf",
      frequency: "Weekly on Monday",
      recipients: ["team@company.com", "manager@company.com"],
      enabled: true,
      lastGenerated: new Date(Date.now() - 604800000),
      nextGeneration: new Date(Date.now() + 259200000),
    },
    {
      id: "2",
      name: "Daily Validation Report",
      type: "html",
      frequency: "Daily at 9:00 AM",
      recipients: ["dba@company.com"],
      enabled: true,
      lastGenerated: new Date(Date.now() - 86400000),
      nextGeneration: new Date(Date.now() + 43200000),
    },
  ])

  const [newReport, setNewReport] = useState({
    project: "",
    type: "pdf",
    sections: {
      summary: true,
      tables: true,
      validation: true,
      performance: true,
      errors: true,
    },
  })

  const getTypeColor = (type: string) => {
    switch (type) {
      case "pdf":
        return "bg-red-500/20 text-red-400"
      case "html":
        return "bg-blue-500/20 text-blue-400"
      case "csv":
        return "bg-green-500/20 text-green-400"
      case "json":
        return "bg-yellow-500/20 text-yellow-400"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground">Generate and schedule migration reports</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <CalendarIcon className="w-4 h-4 mr-2" />
                Schedule Report
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Schedule Automated Report</DialogTitle>
                <DialogDescription>Set up automatic report generation and delivery</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Report Name</Label>
                  <Input placeholder="e.g., Weekly Migration Summary" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Format</Label>
                    <Select defaultValue="pdf">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="html">HTML</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <Select defaultValue="weekly">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Recipients (comma-separated)</Label>
                  <Input placeholder="email1@company.com, email2@company.com" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setShowScheduleDialog(false)}>Create Schedule</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showNewReportDialog} onOpenChange={setShowNewReportDialog}>
            <DialogTrigger asChild>
              <Button>
                <FileTextIcon className="w-4 h-4 mr-2" />
                Generate Report
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Generate New Report</DialogTitle>
                <DialogDescription>Create a new migration report</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Project</Label>
                  <Select value={newReport.project} onValueChange={(v) => setNewReport({ ...newReport, project: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">ERP Migration</SelectItem>
                      <SelectItem value="2">Legacy Data</SelectItem>
                      <SelectItem value="3">CRM Sync</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Format</Label>
                  <Select value={newReport.type} onValueChange={(v) => setNewReport({ ...newReport, type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF Document</SelectItem>
                      <SelectItem value="html">HTML Report</SelectItem>
                      <SelectItem value="csv">CSV Export</SelectItem>
                      <SelectItem value="json">JSON Data</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label>Include Sections</Label>
                  <div className="space-y-2">
                    {Object.entries(newReport.sections).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <Label className="font-normal capitalize">{key} Information</Label>
                        <Switch
                          checked={value}
                          onCheckedChange={(checked) =>
                            setNewReport({
                              ...newReport,
                              sections: { ...newReport.sections, [key]: checked },
                            })
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowNewReportDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setShowNewReportDialog(false)}>
                  <PlayIcon className="w-4 h-4 mr-2" />
                  Generate
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="generated">Generated Reports</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="generated" className="space-y-4">
          <div className="grid gap-4">
            {reports.map((report) => (
              <Card key={report.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <FileTextIcon className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{report.name}</h3>
                        <p className="text-sm text-muted-foreground">{report.projectName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <Badge className={`${getTypeColor(report.type)} border-0 uppercase text-xs`}>{report.type}</Badge>
                      <div className="text-right">
                        <p className="text-sm">{report.size}</p>
                        <p className="text-xs text-muted-foreground">{report.generatedAt.toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon">
                          <EyeIcon className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <DownloadIcon className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <MailIcon className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <TrashIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-4">
          <div className="grid gap-4">
            {scheduledReports.map((schedule) => (
              <Card key={schedule.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Switch checked={schedule.enabled} />
                      <div>
                        <h3 className="font-semibold text-foreground">{schedule.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {schedule.frequency} · {schedule.recipients.length} recipients
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <Badge className={`${getTypeColor(schedule.type)} border-0 uppercase text-xs`}>
                        {schedule.type}
                      </Badge>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Last generated</p>
                        <p className="text-sm">{schedule.lastGenerated?.toLocaleDateString() || "Never"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Next generation</p>
                        <p className="text-sm">{schedule.nextGeneration.toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="sm">
                          <PlayIcon className="w-4 h-4 mr-1" />
                          Run Now
                        </Button>
                        <Button variant="ghost" size="icon">
                          <TrashIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
