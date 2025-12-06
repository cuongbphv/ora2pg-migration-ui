"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import type { Project, User } from "@/lib/types"
import {
  DatabaseIcon,
  FolderIcon,
  PlusIcon,
  SettingsIcon,
  TableIcon,
  OracleIcon,
  PostgresIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  UserIcon,
  LogOutIcon,
  ShieldCheckIcon,
  LayersIcon,
  CalendarIcon,
  CopyIcon,
  RotateCcwIcon,
  BarChart2Icon,
  FileTextIcon,
  UsersIcon,
  MailIcon,
} from "@/components/icons"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface SidebarProps {
  projects: Project[]
  selectedProjectId: string | null
  onSelectProject: (id: string) => void
  onNewProject: () => void
  activeTab: string
  onTabChange: (tab: string) => void
  user?: User | null
  onLogout?: () => void
  onOpenSettings?: () => void
}

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: DatabaseIcon },
  { id: "connections", label: "Connections", icon: DatabaseIcon },
  { id: "tables", label: "Table Mapping", icon: TableIcon },
  { id: "datatypes", label: "Data Types", icon: SettingsIcon },
  { id: "migration", label: "Migration", icon: FolderIcon },
]

const pipelineItems = [
  { id: "pg2pg", label: "PG2PG Pipeline", icon: DatabaseIcon },
]

const roadmapItems = [
  { id: "validation", label: "Data Validation", icon: ShieldCheckIcon },
  { id: "schema", label: "Schema Migration", icon: LayersIcon },
  { id: "scheduler", label: "Scheduler", icon: CalendarIcon },
  { id: "templates", label: "Templates", icon: CopyIcon },
  { id: "rollback", label: "Rollback", icon: RotateCcwIcon },
  { id: "performance", label: "Performance", icon: BarChart2Icon },
  { id: "reports", label: "Reports", icon: FileTextIcon },
  { id: "collaboration", label: "Collaboration", icon: UsersIcon },
  { id: "email-templates", label: "Email Templates", icon: MailIcon },
]

export function Sidebar({
  projects,
  selectedProjectId,
  onSelectProject,
  onNewProject,
  activeTab,
  onTabChange,
  user,
  onLogout,
  onOpenSettings,
}: SidebarProps) {
  const [projectsExpanded, setProjectsExpanded] = useState(true)
  const [roadmapExpanded, setRoadmapExpanded] = useState(true)

  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <OracleIcon className="w-6 h-6 text-oracle" />
              <span className="text-muted-foreground">→</span>
              <PostgresIcon className="w-6 h-6 text-postgres" />
            </div>
            <div>
              <h1 className="font-semibold text-sidebar-foreground">Ora2Pg</h1>
              <p className="text-xs text-muted-foreground">Migration Tool</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onOpenSettings}>
            <SettingsIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Projects Section */}
      <div className="p-2">
        <button
          onClick={() => setProjectsExpanded(!projectsExpanded)}
          className="flex items-center justify-between w-full px-2 py-1.5 text-sm text-muted-foreground hover:text-sidebar-foreground rounded-md hover:bg-sidebar-accent transition-colors"
        >
          <span className="flex items-center gap-2">
            {projectsExpanded ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
            Projects
          </span>
          <div
            onClick={(e) => {
              e.stopPropagation()
              onNewProject()
            }}
            className="p-1 hover:bg-sidebar-accent rounded cursor-pointer"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                e.stopPropagation()
                onNewProject()
              }
            }}
          >
            <PlusIcon className="w-4 h-4" />
          </div>
        </button>

        {projectsExpanded && (
          <div className="mt-1 space-y-0.5">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => onSelectProject(project.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-4 py-2 text-sm rounded-md transition-colors text-left",
                  selectedProjectId === project.id
                    ? "bg-sidebar-accent text-sidebar-foreground"
                    : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
                )}
              >
                <FolderIcon className="w-4 h-4 shrink-0" />
                <span className="truncate">{project.name}</span>
                <span
                  className={cn(
                    "ml-auto px-1.5 py-0.5 text-[10px] rounded font-medium",
                    project.status === "completed" && "bg-success/20 text-success",
                    project.status === "running" && "bg-warning/20 text-warning",
                    project.status === "configured" && "bg-primary/20 text-primary",
                    project.status === "draft" && "bg-muted text-muted-foreground",
                    project.status === "error" && "bg-destructive/20 text-destructive",
                  )}
                >
                  {project.status}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 mt-2 overflow-y-auto">
        <p className="px-2 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Configuration</p>
        <div className="space-y-0.5">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors",
                activeTab === item.id
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent",
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </div>

        <p className="px-2 mb-2 mt-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Pipelines</p>
        <div className="space-y-0.5">
          {pipelineItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors",
                activeTab === item.id
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent",
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-4">
          <button
            onClick={() => setRoadmapExpanded(!roadmapExpanded)}
            className="flex items-center justify-between w-full px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-sidebar-foreground rounded-md hover:bg-sidebar-accent transition-colors"
          >
            <span className="flex items-center gap-2">
              {roadmapExpanded ? <ChevronDownIcon className="w-3 h-3" /> : <ChevronRightIcon className="w-3 h-3" />}
              Advanced
            </span>
          </button>
          {roadmapExpanded && (
            <div className="mt-1 space-y-0.5">
              {roadmapItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors",
                    activeTab === item.id
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent",
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </nav>

      {user && (
        <div className="p-3 border-t border-sidebar-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-sidebar-accent transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  {user.avatar ? (
                    <img src={user.avatar || "/placeholder.svg"} alt={user.name} className="w-8 h-8 rounded-full" />
                  ) : (
                    <UserIcon className="w-4 h-4 text-primary" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <ChevronDownIcon className="w-4 h-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={onOpenSettings}>
                <SettingsIcon className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout} className="text-destructive focus:text-destructive">
                <LogOutIcon className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </aside>
  )
}
