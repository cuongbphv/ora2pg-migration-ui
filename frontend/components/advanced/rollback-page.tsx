"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  RotateCcwIcon,
  DownloadIcon,
  TrashIcon,
  DatabaseIcon,
  AlertIcon,
  CheckIcon,
  HistoryIcon,
  PlayIcon,
} from "@/components/icons"

interface Snapshot {
  id: string
  projectId: string
  projectName: string
  backupFile: string
  tableCount: number
  rowCount: number
  size: string
  createdAt: Date
  createdBy: string
  type: "auto" | "manual"
}

interface RollbackHistory {
  id: string
  snapshotId: string
  snapshotName: string
  rolledBackAt: Date
  rolledBackBy: string
  reason: string
  status: "success" | "failed"
}

export function RollbackPage() {
  const [showCreateSnapshotDialog, setShowCreateSnapshotDialog] = useState(false)
  const [showRollbackDialog, setShowRollbackDialog] = useState(false)
  const [showConfirmRollback, setShowConfirmRollback] = useState(false)
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null)
  const [rollbackReason, setRollbackReason] = useState("")
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false)
  const [snapshotProgress, setSnapshotProgress] = useState(0)

  const [snapshots, setSnapshots] = useState<Snapshot[]>([
    {
      id: "1",
      projectId: "1",
      projectName: "ERP Migration",
      backupFile: "erp_migration_20241201_020000.backup",
      tableCount: 45,
      rowCount: 2850000,
      size: "1.2 GB",
      createdAt: new Date(Date.now() - 86400000),
      createdBy: "System",
      type: "auto",
    },
    {
      id: "2",
      projectId: "1",
      projectName: "ERP Migration",
      backupFile: "erp_migration_20241130_143022.backup",
      tableCount: 45,
      rowCount: 2840000,
      size: "1.18 GB",
      createdAt: new Date(Date.now() - 172800000),
      createdBy: "John Doe",
      type: "manual",
    },
    {
      id: "3",
      projectId: "1",
      projectName: "ERP Migration",
      backupFile: "erp_migration_20241129_020000.backup",
      tableCount: 42,
      rowCount: 2500000,
      size: "1.1 GB",
      createdAt: new Date(Date.now() - 259200000),
      createdBy: "System",
      type: "auto",
    },
  ])

  const [rollbackHistory, setRollbackHistory] = useState<RollbackHistory[]>([
    {
      id: "1",
      snapshotId: "2",
      snapshotName: "erp_migration_20241130_143022.backup",
      rolledBackAt: new Date(Date.now() - 43200000),
      rolledBackBy: "John Doe",
      reason: "Data corruption detected in ORDERS table after migration batch",
      status: "success",
    },
  ])

  const createSnapshot = () => {
    setIsCreatingSnapshot(true)
    setSnapshotProgress(0)
    const interval = setInterval(() => {
      setSnapshotProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsCreatingSnapshot(false)
          setShowCreateSnapshotDialog(false)
          return 100
        }
        return prev + 5
      })
    }, 300)
  }

  const initiateRollback = (snapshot: Snapshot) => {
    setSelectedSnapshot(snapshot)
    setShowRollbackDialog(true)
  }

  const confirmRollback = () => {
    setShowRollbackDialog(false)
    setShowConfirmRollback(true)
  }

  const executeRollback = () => {
    setShowConfirmRollback(false)
    // Add rollback to history
    if (selectedSnapshot) {
      setRollbackHistory([
        {
          id: Date.now().toString(),
          snapshotId: selectedSnapshot.id,
          snapshotName: selectedSnapshot.backupFile,
          rolledBackAt: new Date(),
          rolledBackBy: "Current User",
          reason: rollbackReason,
          status: "success",
        },
        ...rollbackHistory,
      ])
    }
    setRollbackReason("")
    setSelectedSnapshot(null)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Rollback & Recovery</h1>
          <p className="text-muted-foreground">Manage snapshots and rollback to previous states</p>
        </div>
        <Button onClick={() => setShowCreateSnapshotDialog(true)}>
          <DatabaseIcon className="w-4 h-4 mr-2" />
          Create Snapshot
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Snapshots</p>
                <p className="text-2xl font-bold text-foreground">{snapshots.length}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <DatabaseIcon className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Storage</p>
                <p className="text-2xl font-bold text-foreground">3.48 GB</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <DownloadIcon className="w-5 h-5 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rollbacks Performed</p>
                <p className="text-2xl font-bold text-foreground">{rollbackHistory.length}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <RotateCcwIcon className="w-5 h-5 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available Snapshots</CardTitle>
          <CardDescription>Select a snapshot to restore your database to a previous state</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {snapshots.map((snapshot) => (
              <div
                key={snapshot.id}
                className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <DatabaseIcon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-sm font-medium">{snapshot.backupFile}</p>
                      <Badge
                        variant="outline"
                        className={snapshot.type === "auto" ? "text-primary" : "text-orange-500"}
                      >
                        {snapshot.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {snapshot.projectName} · {snapshot.tableCount} tables · {snapshot.rowCount.toLocaleString()} rows
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm font-medium">{snapshot.size}</p>
                    <p className="text-xs text-muted-foreground">
                      {snapshot.createdAt.toLocaleString()} by {snapshot.createdBy}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm">
                      <DownloadIcon className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-warning border-warning/50 hover:bg-warning/10 bg-transparent"
                      onClick={() => initiateRollback(snapshot)}
                    >
                      <RotateCcwIcon className="w-4 h-4 mr-1" />
                      Rollback
                    </Button>
                    <Button variant="ghost" size="icon">
                      <TrashIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HistoryIcon className="w-5 h-5" />
            Rollback History
          </CardTitle>
          <CardDescription>Previous rollback operations performed on this project</CardDescription>
        </CardHeader>
        <CardContent>
          {rollbackHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No rollbacks have been performed yet</div>
          ) : (
            <div className="space-y-3">
              {rollbackHistory.map((history) => (
                <div key={history.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        history.status === "success" ? "bg-success/10" : "bg-destructive/10"
                      }`}
                    >
                      {history.status === "success" ? (
                        <CheckIcon className="w-5 h-5 text-success" />
                      ) : (
                        <AlertIcon className="w-5 h-5 text-destructive" />
                      )}
                    </div>
                    <div>
                      <p className="font-mono text-sm">{history.snapshotName}</p>
                      <p className="text-sm text-muted-foreground">{history.reason}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      className={
                        history.status === "success"
                          ? "bg-success/20 text-success border-0"
                          : "bg-destructive/20 text-destructive border-0"
                      }
                    >
                      {history.status}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {history.rolledBackAt.toLocaleString()} by {history.rolledBackBy}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Snapshot Dialog */}
      <Dialog open={showCreateSnapshotDialog} onOpenChange={setShowCreateSnapshotDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Snapshot</DialogTitle>
            <DialogDescription>Create a backup of the current database state</DialogDescription>
          </DialogHeader>
          {isCreatingSnapshot ? (
            <div className="py-8 space-y-4">
              <div className="flex justify-between text-sm">
                <span>Creating snapshot...</span>
                <span>{snapshotProgress}%</span>
              </div>
              <Progress value={snapshotProgress} />
              <p className="text-xs text-muted-foreground text-center">
                This may take several minutes depending on database size
              </p>
            </div>
          ) : (
            <>
              <div className="py-4 space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Project</span>
                    <span>ERP Migration</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tables</span>
                    <span>45</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Estimated Size</span>
                    <span>~1.2 GB</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Estimated Time</span>
                    <span>~5 minutes</span>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateSnapshotDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={createSnapshot}>
                  <PlayIcon className="w-4 h-4 mr-2" />
                  Create Snapshot
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Rollback Dialog */}
      <Dialog open={showRollbackDialog} onOpenChange={setShowRollbackDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rollback to Snapshot</DialogTitle>
            <DialogDescription>Restore database to: {selectedSnapshot?.backupFile}</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
              <div className="flex items-center gap-2 text-warning font-medium mb-2">
                <AlertIcon className="w-4 h-4" />
                Warning
              </div>
              <p className="text-sm text-warning/80">
                This action will restore the database to the selected snapshot state. All changes made after this
                snapshot will be lost.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Reason for rollback</Label>
              <Textarea
                value={rollbackReason}
                onChange={(e) => setRollbackReason(e.target.value)}
                placeholder="Describe why you are performing this rollback..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRollbackDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmRollback}>
              Continue to Rollback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Rollback Alert */}
      <AlertDialog open={showConfirmRollback} onOpenChange={setShowConfirmRollback}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will restore the database to the snapshot state and all data changes
              after the snapshot will be permanently lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeRollback}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, Rollback Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
