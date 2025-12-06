"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  BarChart2Icon,
  TrendingUpIcon,
  ClockIcon,
  DatabaseIcon,
  AlertIcon,
  RefreshIcon,
  DownloadIcon,
  ZapIcon,
  TargetIcon,
} from "@/components/icons"

interface PerformanceMetric {
  tableName: string
  rowsMigrated: number
  duration: number
  rowsPerSecond: number
  avgRowSize: number
  status: "fast" | "normal" | "slow"
}

interface Recommendation {
  id: string
  type: "warning" | "info" | "success"
  title: string
  description: string
  action?: string
}

export function PerformancePage() {
  const [timeRange, setTimeRange] = useState("24h")
  const [selectedProject, setSelectedProject] = useState("all")

  const overallMetrics = {
    totalRowsMigrated: 2843567,
    totalDuration: "2h 45m",
    avgRowsPerSecond: 28750,
    avgQueryTime: "45ms",
    successRate: 99.8,
    bottlenecks: 2,
  }

  const [tableMetrics, setTableMetrics] = useState<PerformanceMetric[]>([
    {
      tableName: "ORDERS",
      rowsMigrated: 2843567,
      duration: 5940,
      rowsPerSecond: 47851,
      avgRowSize: 450,
      status: "fast",
    },
    {
      tableName: "ORDER_ITEMS",
      rowsMigrated: 8520000,
      duration: 7200,
      rowsPerSecond: 118333,
      avgRowSize: 120,
      status: "fast",
    },
    {
      tableName: "CUSTOMERS",
      rowsMigrated: 150000,
      duration: 180,
      rowsPerSecond: 83333,
      avgRowSize: 380,
      status: "fast",
    },
    {
      tableName: "EMPLOYEES",
      rowsMigrated: 107500,
      duration: 150,
      rowsPerSecond: 71666,
      avgRowSize: 520,
      status: "normal",
    },
    {
      tableName: "AUDIT_LOG",
      rowsMigrated: 5000000,
      duration: 14400,
      rowsPerSecond: 34722,
      avgRowSize: 890,
      status: "slow",
    },
    {
      tableName: "TRANSACTIONS",
      rowsMigrated: 1200000,
      duration: 4800,
      rowsPerSecond: 25000,
      avgRowSize: 1200,
      status: "slow",
    },
  ])

  const [recommendations, setRecommendations] = useState<Recommendation[]>([
    {
      id: "1",
      type: "warning",
      title: "AUDIT_LOG table is slow",
      description:
        "Large row size (890 bytes) is affecting migration speed. Consider increasing batch size or parallel threads.",
      action: "Optimize",
    },
    {
      id: "2",
      type: "warning",
      title: "TRANSACTIONS table bottleneck",
      description:
        "Complex data types requiring conversion are slowing down migration. Pre-process LOB columns separately.",
      action: "View Details",
    },
    {
      id: "3",
      type: "info",
      title: "Network throughput stable",
      description: "Current network speed is 125 MB/s which is within expected range.",
    },
    {
      id: "4",
      type: "success",
      title: "Indexing strategy optimal",
      description: "Disabling indexes during migration improved speed by 40%.",
    },
  ])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "fast":
        return "bg-success/20 text-success"
      case "normal":
        return "bg-primary/20 text-primary"
      case "slow":
        return "bg-destructive/20 text-destructive"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case "warning":
        return <AlertIcon className="w-5 h-5 text-warning" />
      case "success":
        return <ZapIcon className="w-5 h-5 text-success" />
      default:
        return <TargetIcon className="w-5 h-5 text-primary" />
    }
  }

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Performance Analytics</h1>
          <p className="text-muted-foreground">Monitor migration performance and identify bottlenecks</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last 1 hour</SelectItem>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <DownloadIcon className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          <Button variant="outline">
            <RefreshIcon className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Rows</p>
                <p className="text-xl font-bold text-foreground">
                  {(overallMetrics.totalRowsMigrated / 1000000).toFixed(1)}M
                </p>
              </div>
              <DatabaseIcon className="w-5 h-5 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="text-xl font-bold text-foreground">{overallMetrics.totalDuration}</p>
              </div>
              <ClockIcon className="w-5 h-5 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Rows/sec</p>
                <p className="text-xl font-bold text-foreground">
                  {(overallMetrics.avgRowsPerSecond / 1000).toFixed(1)}K
                </p>
              </div>
              <TrendingUpIcon className="w-5 h-5 text-success" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Avg Query</p>
                <p className="text-xl font-bold text-foreground">{overallMetrics.avgQueryTime}</p>
              </div>
              <ZapIcon className="w-5 h-5 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Success Rate</p>
                <p className="text-xl font-bold text-success">{overallMetrics.successRate}%</p>
              </div>
              <TargetIcon className="w-5 h-5 text-success" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Bottlenecks</p>
                <p className="text-xl font-bold text-warning">{overallMetrics.bottlenecks}</p>
              </div>
              <AlertIcon className="w-5 h-5 text-warning" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Table Performance</CardTitle>
            <CardDescription>Migration speed by table</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tableMetrics.map((metric) => (
                <div key={metric.tableName} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm w-32">{metric.tableName}</span>
                      <Badge className={`${getStatusColor(metric.status)} border-0 text-xs`}>{metric.status}</Badge>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <span className="text-muted-foreground w-24 text-right">
                        {metric.rowsMigrated.toLocaleString()} rows
                      </span>
                      <span className="text-muted-foreground w-20 text-right">{formatDuration(metric.duration)}</span>
                      <span className="font-medium w-24 text-right">{metric.rowsPerSecond.toLocaleString()}/s</span>
                    </div>
                  </div>
                  <Progress
                    value={(metric.rowsPerSecond / 120000) * 100}
                    className={`h-2 ${
                      metric.status === "slow"
                        ? "[&>div]:bg-destructive"
                        : metric.status === "fast"
                          ? "[&>div]:bg-success"
                          : ""
                    }`}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
            <CardDescription>Suggestions to improve performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className={`p-3 rounded-lg border ${
                    rec.type === "warning"
                      ? "bg-warning/5 border-warning/20"
                      : rec.type === "success"
                        ? "bg-success/5 border-success/20"
                        : "bg-primary/5 border-primary/20"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {getRecommendationIcon(rec.type)}
                    <div className="flex-1">
                      <p className="font-medium text-sm">{rec.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{rec.description}</p>
                      {rec.action && (
                        <Button variant="link" size="sm" className="h-auto p-0 mt-2 text-xs">
                          {rec.action}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance Timeline</CardTitle>
          <CardDescription>Migration speed over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center bg-muted/30 rounded-lg">
            <div className="text-center text-muted-foreground">
              <BarChart2Icon className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Performance chart visualization</p>
              <p className="text-xs">Showing rows/second over selected time range</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
