"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  CopyIcon,
  DownloadIcon,
  PlusIcon,
  ShareIcon,
  TrashIcon,
  UploadIcon,
  FolderIcon,
  UserIcon,
  UsersIcon,
  ChevronDownIcon,
  SearchIcon,
} from "@/components/icons"

interface MigrationTemplate {
  id: string
  name: string
  description: string
  category: "common" | "enterprise" | "custom"
  isPublic: boolean
  createdBy: string
  createdAt: Date
  tablesCount: number
  mappingsCount: number
  sharedWith: string[]
}

export function TemplatesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [showNewTemplateDialog, setShowNewTemplateDialog] = useState(false)
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<MigrationTemplate | null>(null)

  const [templates, setTemplates] = useState<MigrationTemplate[]>([
    {
      id: "1",
      name: "ERP Standard Migration",
      description:
        "Standard template for ERP systems with common table mappings for HR, Finance, and Inventory modules",
      category: "enterprise",
      isPublic: true,
      createdBy: "System",
      createdAt: new Date(Date.now() - 7776000000),
      tablesCount: 45,
      mappingsCount: 320,
      sharedWith: [],
    },
    {
      id: "2",
      name: "E-Commerce Data",
      description: "Template for e-commerce platforms including orders, customers, products, and inventory",
      category: "common",
      isPublic: true,
      createdBy: "System",
      createdAt: new Date(Date.now() - 5184000000),
      tablesCount: 28,
      mappingsCount: 185,
      sharedWith: [],
    },
    {
      id: "3",
      name: "Custom HR Module",
      description: "Custom template for HR module with specific mappings for our organization",
      category: "custom",
      isPublic: false,
      createdBy: "John Doe",
      createdAt: new Date(Date.now() - 864000000),
      tablesCount: 12,
      mappingsCount: 78,
      sharedWith: ["team@company.com"],
    },
    {
      id: "4",
      name: "Financial Reports",
      description: "Financial reporting tables and views migration template",
      category: "custom",
      isPublic: false,
      createdBy: "Jane Smith",
      createdAt: new Date(Date.now() - 432000000),
      tablesCount: 18,
      mappingsCount: 95,
      sharedWith: ["finance@company.com", "team@company.com"],
    },
  ])

  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    sourceProject: "",
  })

  const filteredTemplates = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "enterprise":
        return "bg-purple-500/20 text-purple-400"
      case "common":
        return "bg-primary/20 text-primary"
      case "custom":
        return "bg-orange-500/20 text-orange-400"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Migration Templates</h1>
          <p className="text-muted-foreground">Save and reuse migration configurations</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <UploadIcon className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Dialog open={showNewTemplateDialog} onOpenChange={setShowNewTemplateDialog}>
            <DialogTrigger asChild>
              <Button>
                <PlusIcon className="w-4 h-4 mr-2" />
                Create Template
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Template</DialogTitle>
                <DialogDescription>Save current project configuration as a reusable template</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Template Name</Label>
                  <Input
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                    placeholder="e.g., ERP Standard Migration"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={newTemplate.description}
                    onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                    placeholder="Describe what this template includes..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Source Project</Label>
                  <Input value="Current Project" disabled />
                  <p className="text-xs text-muted-foreground">
                    Template will include all table mappings, column mappings, and data type rules
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowNewTemplateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setShowNewTemplateDialog(false)}>Create Template</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="cursor-pointer hover:bg-muted">
            All
          </Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-muted">
            Enterprise
          </Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-muted">
            Common
          </Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-muted">
            Custom
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FolderIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={`${getCategoryColor(template.category)} border-0 text-xs`}>
                        {template.category}
                      </Badge>
                      {template.isPublic ? (
                        <Badge variant="outline" className="text-xs">
                          <UsersIcon className="w-3 h-3 mr-1" />
                          Public
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          <UserIcon className="w-3 h-3 mr-1" />
                          Private
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <ChevronDownIcon className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <CopyIcon className="w-4 h-4 mr-2" />
                      Use Template
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedTemplate(template)
                        setShowShareDialog(true)
                      }}
                    >
                      <ShareIcon className="w-4 h-4 mr-2" />
                      Share
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <DownloadIcon className="w-4 h-4 mr-2" />
                      Export
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      <TrashIcon className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{template.description}</p>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground">
                    <strong className="text-foreground">{template.tablesCount}</strong> tables
                  </span>
                  <span className="text-muted-foreground">
                    <strong className="text-foreground">{template.mappingsCount}</strong> mappings
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  by {template.createdBy} · {template.createdAt.toLocaleDateString()}
                </span>
              </div>
              {template.sharedWith.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">Shared with: {template.sharedWith.join(", ")}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Template</DialogTitle>
            <DialogDescription>Share "{selectedTemplate?.name}" with team members</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Share with (email)</Label>
              <Input placeholder="Enter email address" />
            </div>
            <div className="space-y-2">
              <Label>Permission</Label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input type="radio" name="permission" value="view" defaultChecked />
                  <span className="text-sm">View only</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="permission" value="use" />
                  <span className="text-sm">Can use</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="permission" value="edit" />
                  <span className="text-sm">Can edit</span>
                </label>
              </div>
            </div>
            {selectedTemplate && selectedTemplate.sharedWith.length > 0 && (
              <div className="space-y-2">
                <Label>Currently shared with</Label>
                <div className="space-y-2">
                  {selectedTemplate.sharedWith.map((email) => (
                    <div key={email} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                      <span className="text-sm">{email}</span>
                      <Button variant="ghost" size="sm">
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShareDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowShareDialog(false)}>Share</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
