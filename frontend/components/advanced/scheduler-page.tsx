"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { PlayIcon, PlusIcon, RefreshIcon, CalendarIcon, CheckIcon, AlertIcon, TrashIcon, EditIcon } from "@/components/icons"

interface ScheduledJob {
  id: string
  name: string
  projectId: string
  projectName: string
  cronExpression: string
  cronHuman: string
  enabled: boolean
  lastRun: Date | null
  nextRun: Date
  status: "idle" | "running" | "success" | "failed"
}

interface SyncTracking {
  id: string
  tableName: string
  lastSyncTimestamp: Date
  lastSyncVersion: number
  rowsSynced: number
  status: "synced" | "pending" | "syncing"
}

export function SchedulerPage() {
  const [activeTab, setActiveTab] = useState("schedules")
  const [showNewJobDialog, setShowNewJobDialog] = useState(false)

  const [scheduledJobs, setScheduledJobs] = useState<ScheduledJob[]>([
    {
      id: "1",
      name: "Daily Full Sync",
      projectId: "1",
      projectName: "ERP Migration",
      cronExpression: "0 2 * * *",
      cronHuman: "Every day at 2:00 AM",
      enabled: true,
      lastRun: new Date(Date.now() - 86400000),
      nextRun: new Date(Date.now() + 43200000),
      status: "success",
    },
    {
      id: "2",
      name: "Hourly Incremental",
      projectId: "1",
      projectName: "ERP Migration",
      cronExpression: "0 * * * *",
      cronHuman: "Every hour",
      enabled: true,
      lastRun: new Date(Date.now() - 3600000),
      nextRun: new Date(Date.now() + 1800000),
      status: "success",
    },
    {
      id: "3",
      name: "Weekly Archive Sync",
      projectId: "2",
      projectName: "Legacy Data",
      cronExpression: "0 0 * * 0",
      cronHuman: "Every Sunday at midnight",
      enabled: false,
      lastRun: new Date(Date.now() - 604800000),
      nextRun: new Date(Date.now() + 259200000),
      status: "idle",
    },
  ])

  const [syncTracking, setSyncTracking] = useState<SyncTracking[]>([
    {
      id: "1",
      tableName: "EMPLOYEES",
      lastSyncTimestamp: new Date(Date.now() - 3600000),
      lastSyncVersion: 15420,
      rowsSynced: 250,
      status: "synced",
    },
    {
      id: "2",
      tableName: "ORDERS",
      lastSyncTimestamp: new Date(Date.now() - 3600000),
      lastSyncVersion: 284356,
      rowsSynced: 1520,
      status: "synced",
    },
    {
      id: "3",
      tableName: "CUSTOMERS",
      lastSyncTimestamp: new Date(Date.now() - 7200000),
      lastSyncVersion: 15000,
      rowsSynced: 0,
      status: "pending",
    },
    {
      id: "4",
      tableName: "PRODUCTS",
      lastSyncTimestamp: new Date(),
      lastSyncVersion: 8500,
      rowsSynced: 45,
      status: "syncing",
    },
  ])

  const [newJob, setNewJob] = useState({
    name: "",
    projectId: "",
    frequency: "daily",
    time: "02:00",
    dayOfWeek: "0",
  })

  const toggleJobEnabled = (id: string) => {
    setScheduledJobs((jobs) => jobs.map((job) => (job.id === id ? { ...job, enabled: !job.enabled } : job)))
  }

  const deleteJob = (id: string) => {
    setScheduledJobs((jobs) => jobs.filter((job) => job.id !== id))
  }

  const runJobNow = (id: string) => {
    setScheduledJobs((jobs) => jobs.map((job) => (job.id === id ? { ...job, status: "running" } : job)))
    setTimeout(() => {
      setScheduledJobs((jobs) =>
        jobs.map((job) => (job.id === id ? { ...job, status: "success", lastRun: new Date() } : job)),
      )
    }, 3000)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Scheduler & Automation</h1>
          <p className="text-muted-foreground">Configure scheduled migrations and incremental sync</p>
        </div>
        <Dialog open={showNewJobDialog} onOpenChange={setShowNewJobDialog}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="w-4 h-4 mr-2" />
              New Schedule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Schedule</DialogTitle>
              <DialogDescription>Set up a new scheduled migration job</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Job Name</Label>
                <Input
                  value={newJob.name}
                  onChange={(e) => setNewJob({ ...newJob, name: e.target.value })}
                  placeholder="e.g., Daily Full Sync"
                />
              </div>
              <div className="space-y-2">
                <Label>Project</Label>
                <Select value={newJob.projectId} onValueChange={(v) => setNewJob({ ...newJob, projectId: v })}>
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
                <Label>Frequency</Label>
                <Select value={newJob.frequency} onValueChange={(v) => setNewJob({ ...newJob, frequency: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="custom">Custom (Cron)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newJob.frequency === "daily" && (
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input
                    type="time"
                    value={newJob.time}
                    onChange={(e) => setNewJob({ ...newJob, time: e.target.value })}
                  />
                </div>
              )}
              {newJob.frequency === "weekly" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Day of Week</Label>
                    <Select value={newJob.dayOfWeek} onValueChange={(v) => setNewJob({ ...newJob, dayOfWeek: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Sunday</SelectItem>
                        <SelectItem value="1">Monday</SelectItem>
                        <SelectItem value="2">Tuesday</SelectItem>
                        <SelectItem value="3">Wednesday</SelectItem>
                        <SelectItem value="4">Thursday</SelectItem>
                        <SelectItem value="5">Friday</SelectItem>
                        <SelectItem value="6">Saturday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Time</Label>
                    <Input
                      type="time"
                      value={newJob.time}
                      onChange={(e) => setNewJob({ ...newJob, time: e.target.value })}
                    />
                  </div>
                </div>
              )}
              {newJob.frequency === "custom" && (
                <div className="space-y-2">
                  <Label>Cron Expression</Label>
                  <Input placeholder="0 2 * * *" />
                  <p className="text-xs text-muted-foreground">Format: minute hour day month weekday</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewJobDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => setShowNewJobDialog(false)}>Create Schedule</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="schedules" className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4" />
            Scheduled Jobs
          </TabsTrigger>
          <TabsTrigger value="incremental" className="flex items-center gap-2">
            <RefreshIcon className="w-4 h-4" />
            Incremental Sync
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedules" className="space-y-4">
          <div className="grid gap-4">
            {scheduledJobs.map((job) => (
              <Card key={job.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Switch checked={job.enabled} onCheckedChange={() => toggleJobEnabled(job.id)} />
                      <div>
                        <h3 className="font-semibold text-foreground">{job.name}</h3>
                        <p className="text-sm text-muted-foreground">{job.projectName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground">{job.cronHuman}</p>
                        <p className="text-xs text-muted-foreground font-mono">{job.cronExpression}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Last Run</p>
                        <p className="text-sm">{job.lastRun ? job.lastRun.toLocaleString() : "Never"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Next Run</p>
                        <p className="text-sm">{job.nextRun.toLocaleString()}</p>
                      </div>
                      <Badge
                        className={
                          job.status === "success"
                            ? "bg-success/20 text-success border-0"
                            : job.status === "running"
                              ? "bg-primary/20 text-primary border-0"
                              : job.status === "failed"
                                ? "bg-destructive/20 text-destructive border-0"
                                : "bg-muted text-muted-foreground border-0"
                        }
                      >
                        {job.status === "running" && <RefreshIcon className="w-3 h-3 mr-1 animate-spin" />}
                        {job.status === "success" && <CheckIcon className="w-3 h-3 mr-1" />}
                        {job.status === "failed" && <AlertIcon className="w-3 h-3 mr-1" />}
                        {job.status}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => runJobNow(job.id)}
                          disabled={job.status === "running"}
                        >
                          <PlayIcon className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <EditIcon className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteJob(job.id)}>
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

        <TabsContent value="incremental" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Incremental Sync Configuration</CardTitle>
              <CardDescription>Track and sync only changed data since last migration</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Sync Method</Label>
                    <Select defaultValue="timestamp">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="timestamp">Timestamp-based</SelectItem>
                        <SelectItem value="version">Version-based</SelectItem>
                        <SelectItem value="cdc">Change Data Capture (CDC)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Timestamp Column</Label>
                    <Input placeholder="updated_at" defaultValue="updated_at" />
                  </div>
                  <div className="space-y-2">
                    <Label>Batch Size</Label>
                    <Input type="number" placeholder="1000" defaultValue="1000" />
                  </div>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 text-sm font-medium">Table</th>
                        <th className="text-left p-3 text-sm font-medium">Last Sync</th>
                        <th className="text-right p-3 text-sm font-medium">Version</th>
                        <th className="text-right p-3 text-sm font-medium">Rows Synced</th>
                        <th className="text-center p-3 text-sm font-medium">Status</th>
                        <th className="text-center p-3 text-sm font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {syncTracking.map((track) => (
                        <tr key={track.id} className="hover:bg-muted/30">
                          <td className="p-3 font-mono text-sm">{track.tableName}</td>
                          <td className="p-3 text-sm">{track.lastSyncTimestamp.toLocaleString()}</td>
                          <td className="p-3 text-right font-mono text-sm">{track.lastSyncVersion.toLocaleString()}</td>
                          <td className="p-3 text-right font-mono text-sm">{track.rowsSynced.toLocaleString()}</td>
                          <td className="p-3 text-center">
                            <Badge
                              className={
                                track.status === "synced"
                                  ? "bg-success/20 text-success border-0"
                                  : track.status === "syncing"
                                    ? "bg-primary/20 text-primary border-0"
                                    : "bg-warning/20 text-warning border-0"
                              }
                            >
                              {track.status === "syncing" && <RefreshIcon className="w-3 h-3 mr-1 animate-spin" />}
                              {track.status}
                            </Badge>
                          </td>
                          <td className="p-3 text-center">
                            <Button variant="ghost" size="sm">
                              <RefreshIcon className="w-4 h-4 mr-1" />
                              Sync Now
                            </Button>
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
      </Tabs>
    </div>
  )
}
