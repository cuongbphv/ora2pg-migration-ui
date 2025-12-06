"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/sidebar"
import { Dashboard } from "@/components/ora2pg/dashboard"
import { ConnectionForm } from "@/components/ora2pg/connection-form"
import { TableMappingView } from "@/components/ora2pg/table-mapping"
import { DataTypeRules } from "@/components/ora2pg/data-type-rules"
import { MigrationPanel } from "@/components/ora2pg/migration-panel"
import { NewProjectDialog } from "@/components/ora2pg/new-project-dialog"
import { LoginPage } from "@/components/auth/login-page"
import { SettingsDialog, defaultSettings } from "@/components/ora2pg/settings-dialog"
import { AuthProvider, useAuth } from "@/lib/auth-context"
import { apiService } from "@/lib/api"
import type { Project, ConnectionConfig, AppSettings } from "@/lib/types"
import PGPipelineBuilder from "@/components/pg2pg/pg-pipeline-builder"
import PGPipelineManager from "@/components/pg2pg/pg-pipeline-manager"
import { DataValidationPage } from "@/components/advanced/data-validation-page"
import { SchemaMigrationPage } from "@/components/advanced/schema-migration-page"
import { CollaborationPage } from "@/components/advanced/collaboration-page"
import { PerformancePage } from "@/components/advanced/performance-page"
import { ReportsPage } from "@/components/advanced/reports-page"
import { RollbackPage } from "@/components/advanced/rollback-page"
import { SchedulerPage } from "@/components/advanced/scheduler-page"
import { TemplatesPage } from "@/components/advanced/templates-page"
import { toast } from "sonner"
import { EmailTemplatePage } from "@/components/advanced/email-template-page"

function MainContent() {
  const { user, logout, isLoading: authLoading } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("dashboard")
  const [newProjectOpen, setNewProjectOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [appSettings, setAppSettings] = useState<AppSettings>(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [migrationKey, setMigrationKey] = useState(0)
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null)

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || null

  // Load projects on mount and when user changes
  useEffect(() => {
    if (user && !authLoading) {
      loadProjects()
      loadSettings()
    } else if (!authLoading && !user) {
      // No user and auth is done loading, stop loading state
      setLoading(false)
    }
  }, [user, authLoading])

  // Reload project when switching to dashboard tab to get fresh data
  useEffect(() => {
    if (activeTab === "dashboard" && selectedProjectId && user && !authLoading) {
      // Reload projects to get updated table statuses
      loadProjects()
    }
  }, [activeTab])

  // Force remount of migration panel when switching to migration tab to ensure fresh data
  useEffect(() => {
    if (activeTab === "migration") {
      // Force remount by changing key to ensure fresh data load
      setMigrationKey((prev) => prev + 1)
    }
  }, [activeTab])

  const loadProjects = async () => {
    try {
      setLoading(true)
      const result = await apiService.getProjects()
      if (result.data && Array.isArray(result.data)) {
        setProjects(result.data as Project[])
        if (result.data.length > 0 && !selectedProjectId) {
          setSelectedProjectId(result.data[0].id)
        }
      } else if (result.error) {
        toast.error("Failed to load projects: " + result?.error)
        // If it's an auth error, the auth context will handle it
        if (result.error.includes("Authentication")) {
          // Token might be invalid, let auth context handle it
          return
        }
      }
    } catch (error) {
      toast.error("Failed to load projects: " + (error instanceof Error ? error.message : "Unknown error"))
    } finally {
      setLoading(false)
    }
  }

  const loadSettings = async () => {
    try {
      const result = await apiService.getSettings()
      if (result.data) {
        setAppSettings(result.data as AppSettings)
      }
    } catch (error) {
      console.error("Failed to load settings:", error)
    }
  }

  const handleNewProject = async (name: string, description: string) => {
    try {
      const result = await apiService.createProject(name, description)
      if (result.data) {
        const project = result.data as Project
        await loadProjects()
        setSelectedProjectId(project.id)
        setNewProjectOpen(false)
      }
    } catch (error) {
      console.error("Failed to create project:", error)
    }
  }

  const handleSaveSource = async (config: ConnectionConfig) => {
    if (!selectedProjectId) return
    try {
      const result = await apiService.saveConnection(selectedProjectId, "source", config)
      if (result.data) {
        const project = result.data as Project
        await loadProjects()
        setSelectedProjectId(project.id)
      }
    } catch (error) {
      console.error("Failed to save source connection:", error)
    }
  }

  const handleSaveTarget = async (config: ConnectionConfig) => {
    if (!selectedProjectId) return
    try {
      const result = await apiService.saveConnection(selectedProjectId, "target", config)
      if (result.data) {
        const project = result.data as Project
        await loadProjects()
        setSelectedProjectId(project.id)
      }
    } catch (error) {
      console.error("Failed to save target connection:", error)
    }
  }

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard project={selectedProject} />
      case "connections":
        return (
          <ConnectionForm
            sourceConnection={selectedProject?.sourceConnection}
            targetConnection={selectedProject?.targetConnection}
            onSaveSource={handleSaveSource}
            onSaveTarget={handleSaveTarget}
          />
        )
      case "tables":
        return (
          <TableMappingView
            projectId={selectedProjectId}
            appSettings={{
              tableNameFilter: appSettings.tableNameFilter,
              columnNamingStrategy: appSettings.columnNamingStrategy,
            }}
          />
        )
      case "datatypes":
        return <DataTypeRules />
      case "migration":
        return <MigrationPanel key={migrationKey} projectId={selectedProjectId} />
      case "pg2pg":
        return selectedPipelineId ? (
          <PGPipelineBuilder pipelineId={selectedPipelineId} onBack={() => setSelectedPipelineId(null)} />
        ) : (
          <PGPipelineManager onSelectPipeline={setSelectedPipelineId} />
        )
      // Roadmap pages
      case "validation":
        return <DataValidationPage projectId={selectedProjectId || ""} project={selectedProject || undefined} />
      case "schema":
        return <SchemaMigrationPage />
      case "scheduler":
        return <SchedulerPage />
      case "templates":
        return <TemplatesPage />
      case "rollback":
        return <RollbackPage />
      case "performance":
        return <PerformancePage />
      case "reports":
        return <ReportsPage />
      case "collaboration":
        return <CollaborationPage />
      case "email-templates":
        return <EmailTemplatePage />
      default:
        return <Dashboard project={selectedProject} />
    }
  }

  // Show loading only if auth is loading or if we have a user and are loading projects
  if (authLoading || (user && loading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  // Show login page if no user (and auth is done loading)
  if (!user) {
    return <LoginPage />
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={setSelectedProjectId}
        onNewProject={() => setNewProjectOpen(true)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        user={user}
        onLogout={logout}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <main className="flex-1 overflow-auto">{renderContent()}</main>

      <NewProjectDialog open={newProjectOpen} onOpenChange={setNewProjectOpen} onCreateProject={handleNewProject} />

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={appSettings}
        onSaveSettings={async (settings) => {
          try {
            const result = await apiService.updateSettings(settings)
            if (result.data) {
              setAppSettings(settings)
            }
          } catch (error) {
            console.error("Failed to save settings:", error)
          }
        }}
      />
    </div>
  )
}

export default function HomePage() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  )
}
