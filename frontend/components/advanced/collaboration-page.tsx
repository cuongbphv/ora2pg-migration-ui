"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
import {
  UsersIcon,
  UserIcon,
  CheckIcon,
  AlertIcon,
  ClockIcon,
  PlusIcon,
  TrashIcon,
  MailIcon,
  ShieldCheckIcon,
} from "@/components/icons"

interface TeamMember {
  id: string
  name: string
  email: string
  role: "owner" | "admin" | "editor" | "viewer"
  avatar?: string
  lastActive: Date
}

interface ApprovalRequest {
  id: string
  projectName: string
  requestedBy: string
  requestedAt: Date
  status: "pending" | "approved" | "rejected"
  approvedBy?: string
  approvedAt?: Date
  comments: string
  type: "migration" | "rollback" | "schema-change"
}

interface ActivityLog {
  id: string
  user: string
  action: string
  target: string
  timestamp: Date
}

export function CollaborationPage() {
  const [activeTab, setActiveTab] = useState("team")
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [showApprovalDialog, setShowApprovalDialog] = useState(false)
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null)

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
    { id: "1", name: "John Doe", email: "john@company.com", role: "owner", lastActive: new Date() },
    {
      id: "2",
      name: "Jane Smith",
      email: "jane@company.com",
      role: "admin",
      lastActive: new Date(Date.now() - 3600000),
    },
    {
      id: "3",
      name: "Bob Wilson",
      email: "bob@company.com",
      role: "editor",
      lastActive: new Date(Date.now() - 86400000),
    },
    {
      id: "4",
      name: "Alice Brown",
      email: "alice@company.com",
      role: "viewer",
      lastActive: new Date(Date.now() - 172800000),
    },
  ])

  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>([
    {
      id: "1",
      projectName: "ERP Migration",
      requestedBy: "Bob Wilson",
      requestedAt: new Date(Date.now() - 7200000),
      status: "pending",
      comments: "Ready to migrate ORDERS table to production. All validation tests passed.",
      type: "migration",
    },
    {
      id: "2",
      projectName: "Legacy Data",
      requestedBy: "Alice Brown",
      requestedAt: new Date(Date.now() - 86400000),
      status: "approved",
      approvedBy: "John Doe",
      approvedAt: new Date(Date.now() - 43200000),
      comments: "Schema changes for new customer fields.",
      type: "schema-change",
    },
    {
      id: "3",
      projectName: "ERP Migration",
      requestedBy: "Jane Smith",
      requestedAt: new Date(Date.now() - 172800000),
      status: "rejected",
      approvedBy: "John Doe",
      approvedAt: new Date(Date.now() - 129600000),
      comments: "Rollback request due to data corruption in test environment.",
      type: "rollback",
    },
  ])

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([
    {
      id: "1",
      user: "John Doe",
      action: "approved",
      target: "Schema change request",
      timestamp: new Date(Date.now() - 43200000),
    },
    {
      id: "2",
      user: "Bob Wilson",
      action: "submitted",
      target: "Migration approval request",
      timestamp: new Date(Date.now() - 7200000),
    },
    {
      id: "3",
      user: "Jane Smith",
      action: "modified",
      target: "Table mapping for EMPLOYEES",
      timestamp: new Date(Date.now() - 14400000),
    },
    {
      id: "4",
      user: "Alice Brown",
      action: "viewed",
      target: "Performance analytics",
      timestamp: new Date(Date.now() - 21600000),
    },
  ])

  const getRoleColor = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-purple-500/20 text-purple-400"
      case "admin":
        return "bg-red-500/20 text-red-400"
      case "editor":
        return "bg-blue-500/20 text-blue-400"
      case "viewer":
        return "bg-gray-500/20 text-gray-400"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-warning/20 text-warning"
      case "approved":
        return "bg-success/20 text-success"
      case "rejected":
        return "bg-destructive/20 text-destructive"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "migration":
        return "bg-primary/20 text-primary"
      case "rollback":
        return "bg-orange-500/20 text-orange-400"
      case "schema-change":
        return "bg-purple-500/20 text-purple-400"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const handleApproval = (id: string, approved: boolean) => {
    setApprovalRequests((requests) =>
      requests.map((req) =>
        req.id === id
          ? {
              ...req,
              status: approved ? "approved" : "rejected",
              approvedBy: "Current User",
              approvedAt: new Date(),
            }
          : req,
      ),
    )
    setShowApprovalDialog(false)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Team Collaboration</h1>
          <p className="text-muted-foreground">Manage team access, permissions, and approvals</p>
        </div>
        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="w-4 h-4 mr-2" />
              Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>Add a new member to your project team</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input placeholder="colleague@company.com" type="email" />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select defaultValue="editor">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin - Full access</SelectItem>
                    <SelectItem value="editor">Editor - Can modify</SelectItem>
                    <SelectItem value="viewer">Viewer - Read only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Projects</Label>
                <Select defaultValue="all">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    <SelectItem value="erp">ERP Migration</SelectItem>
                    <SelectItem value="legacy">Legacy Data</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => setShowInviteDialog(false)}>
                <MailIcon className="w-4 h-4 mr-2" />
                Send Invite
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="team" className="flex items-center gap-2">
            <UsersIcon className="w-4 h-4" />
            Team Members
          </TabsTrigger>
          <TabsTrigger value="approvals" className="flex items-center gap-2">
            <ShieldCheckIcon className="w-4 h-4" />
            Approvals
            {approvalRequests.filter((a) => a.status === "pending").length > 0 && (
              <Badge className="bg-warning text-warning-foreground ml-1">
                {approvalRequests.filter((a) => a.status === "pending").length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <ClockIcon className="w-4 h-4" />
            Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>{teamMembers.length} members with access to this workspace</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <UserIcon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">{member.name}</h3>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <Badge className={`${getRoleColor(member.role)} border-0 capitalize`}>{member.role}</Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          Active {member.lastActive.toLocaleDateString()}
                        </p>
                      </div>
                      <Select defaultValue={member.role}>
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                      {member.role !== "owner" && (
                        <Button variant="ghost" size="icon">
                          <TrashIcon className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Approval Requests</CardTitle>
              <CardDescription>Review and approve migration operations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {approvalRequests.map((approval) => (
                  <div
                    key={approval.id}
                    className={`p-4 border rounded-lg ${
                      approval.status === "pending" ? "border-warning/50 bg-warning/5" : "border-border"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-foreground">{approval.projectName}</h3>
                          <Badge className={`${getTypeColor(approval.type)} border-0 capitalize text-xs`}>
                            {approval.type.replace("-", " ")}
                          </Badge>
                          <Badge className={`${getStatusColor(approval.status)} border-0 capitalize text-xs`}>
                            {approval.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{approval.comments}</p>
                        <p className="text-xs text-muted-foreground">
                          Requested by {approval.requestedBy} · {approval.requestedAt.toLocaleString()}
                        </p>
                        {approval.approvedBy && (
                          <p className="text-xs text-muted-foreground">
                            {approval.status === "approved" ? "Approved" : "Rejected"} by {approval.approvedBy} ·{" "}
                            {approval.approvedAt?.toLocaleString()}
                          </p>
                        )}
                      </div>
                      {approval.status === "pending" && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive border-destructive/50 bg-transparent"
                            onClick={() => handleApproval(approval.id, false)}
                          >
                            <AlertIcon className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            className="bg-success hover:bg-success/90"
                            onClick={() => handleApproval(approval.id, true)}
                          >
                            <CheckIcon className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
              <CardDescription>Recent actions by team members</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activityLogs.map((log) => (
                  <div key={log.id} className="flex items-center gap-4 py-3 border-b border-border last:border-0">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <UserIcon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-medium text-foreground">{log.user}</span>
                        <span className="text-muted-foreground"> {log.action} </span>
                        <span className="text-foreground">{log.target}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">{log.timestamp.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
