"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { PlusIcon, MailIcon, EditIcon, TrashIcon, SaveIcon, XIcon, CheckIcon, SearchIcon, PlayIcon } from "@/components/icons"

// Email template types for different notifications
type EmailTemplateType =
  | "migration_started"
  | "migration_success"
  | "migration_failed"
  | "validation_report"
  | "schedule_reminder"
  | "error_alert"
  | "daily_summary"
  | "custom"

interface TemplateVariable {
  id: string
  name: string
  key: string
  defaultValue: string
  description: string
  type: "text" | "number" | "date" | "list" | "boolean"
}

interface EmailTemplate {
  id: string
  name: string
  type: EmailTemplateType
  subject: string
  body: string
  variables: TemplateVariable[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const templateTypeLabels: Record<EmailTemplateType, { label: string; color: string }> = {
  migration_started: { label: "Migration Started", color: "bg-blue-500/20 text-blue-400" },
  migration_success: { label: "Migration Success", color: "bg-green-500/20 text-green-400" },
  migration_failed: { label: "Migration Failed", color: "bg-red-500/20 text-red-400" },
  validation_report: { label: "Validation Report", color: "bg-purple-500/20 text-purple-400" },
  schedule_reminder: { label: "Schedule Reminder", color: "bg-yellow-500/20 text-yellow-400" },
  error_alert: { label: "Error Alert", color: "bg-orange-500/20 text-orange-400" },
  daily_summary: { label: "Daily Summary", color: "bg-cyan-500/20 text-cyan-400" },
  custom: { label: "Custom", color: "bg-gray-500/20 text-gray-400" },
}

const defaultVariables: TemplateVariable[] = [
  {
    id: "1",
    name: "Project Name",
    key: "project_name",
    defaultValue: "My Migration Project",
    description: "Name of the migration project",
    type: "text",
  },
  {
    id: "2",
    name: "Pipeline Name",
    key: "pipeline_name",
    defaultValue: "Main Pipeline",
    description: "Name of the pipeline being executed",
    type: "text",
  },
  {
    id: "3",
    name: "Start Time",
    key: "start_time",
    defaultValue: "2025-01-15 10:00:00",
    description: "Migration start timestamp",
    type: "date",
  },
  {
    id: "4",
    name: "End Time",
    key: "end_time",
    defaultValue: "2025-01-15 12:30:00",
    description: "Migration end timestamp",
    type: "date",
  },
  {
    id: "5",
    name: "Total Tables",
    key: "total_tables",
    defaultValue: "25",
    description: "Total number of tables migrated",
    type: "number",
  },
  {
    id: "6",
    name: "Total Rows",
    key: "total_rows",
    defaultValue: "1,500,000",
    description: "Total number of rows migrated",
    type: "number",
  },
  {
    id: "7",
    name: "Success Count",
    key: "success_count",
    defaultValue: "24",
    description: "Number of successful table migrations",
    type: "number",
  },
  {
    id: "8",
    name: "Failed Count",
    key: "failed_count",
    defaultValue: "1",
    description: "Number of failed table migrations",
    type: "number",
  },
  {
    id: "9",
    name: "Error Message",
    key: "error_message",
    defaultValue: "Connection timeout",
    description: "Error message if migration failed",
    type: "text",
  },
  {
    id: "10",
    name: "Source Database",
    key: "source_db",
    defaultValue: "oracle_prod",
    description: "Source database name",
    type: "text",
  },
  {
    id: "11",
    name: "Target Database",
    key: "target_db",
    defaultValue: "postgres_prod",
    description: "Target database name",
    type: "text",
  },
  {
    id: "12",
    name: "Duration",
    key: "duration",
    defaultValue: "2h 30m",
    description: "Total migration duration",
    type: "text",
  },
  {
    id: "13",
    name: "User Name",
    key: "user_name",
    defaultValue: "Admin User",
    description: "User who initiated the migration",
    type: "text",
  },
  {
    id: "14",
    name: "Report Link",
    key: "report_link",
    defaultValue: "https://example.com/report/123",
    description: "Link to detailed report",
    type: "text",
  },
]

const mockTemplates: EmailTemplate[] = [
  {
    id: "1",
    name: "Migration Success Notification",
    type: "migration_success",
    subject: "[SUCCESS] Migration {{project_name}} completed",
    body: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #10b981, #059669); padding: 30px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
    .stat-box { background: #f8fafc; padding: 15px; border-radius: 6px; text-align: center; }
    .stat-value { font-size: 28px; font-weight: bold; color: #10b981; }
    .stat-label { color: #64748b; font-size: 12px; text-transform: uppercase; }
    .footer { background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 12px; }
    .btn { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✓ Migration Completed Successfully</h1>
    </div>
    <div class="content">
      <p>Hello {{user_name}},</p>
      <p>Your migration project <strong>{{project_name}}</strong> has been completed successfully.</p>
      
      <div class="stats">
        <div class="stat-box">
          <div class="stat-value">{{total_tables}}</div>
          <div class="stat-label">Tables Migrated</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">{{total_rows}}</div>
          <div class="stat-label">Rows Transferred</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">{{duration}}</div>
          <div class="stat-label">Duration</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">{{success_count}}/{{total_tables}}</div>
          <div class="stat-label">Success Rate</div>
        </div>
      </div>
      
      <p><strong>Details:</strong></p>
      <ul>
        <li>Pipeline: {{pipeline_name}}</li>
        <li>Source: {{source_db}}</li>
        <li>Target: {{target_db}}</li>
        <li>Started: {{start_time}}</li>
        <li>Completed: {{end_time}}</li>
      </ul>
      
      <a href="{{report_link}}" class="btn">View Full Report</a>
    </div>
    <div class="footer">
      <p>This is an automated message from Ora2Pg Migration Tool</p>
    </div>
  </div>
</body>
</html>`,
    variables: defaultVariables.filter((v) =>
      [
        "project_name",
        "pipeline_name",
        "user_name",
        "total_tables",
        "total_rows",
        "duration",
        "success_count",
        "source_db",
        "target_db",
        "start_time",
        "end_time",
        "report_link",
      ].includes(v.key),
    ),
    isActive: true,
    createdAt: new Date("2025-01-10"),
    updatedAt: new Date("2025-01-14"),
  },
  {
    id: "2",
    name: "Migration Failed Alert",
    type: "migration_failed",
    subject: "[FAILED] Migration {{project_name}} encountered errors",
    body: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #ef4444, #dc2626); padding: 30px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .error-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 15px; margin: 20px 0; }
    .error-title { color: #dc2626; font-weight: bold; margin-bottom: 10px; }
    .error-message { color: #7f1d1d; font-family: monospace; }
    .footer { background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 12px; }
    .btn { display: inline-block; background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✗ Migration Failed</h1>
    </div>
    <div class="content">
      <p>Hello {{user_name}},</p>
      <p>Unfortunately, your migration project <strong>{{project_name}}</strong> has encountered an error.</p>
      
      <div class="error-box">
        <div class="error-title">Error Details:</div>
        <div class="error-message">{{error_message}}</div>
      </div>
      
      <p><strong>Progress before failure:</strong></p>
      <ul>
        <li>Tables completed: {{success_count}} / {{total_tables}}</li>
        <li>Tables failed: {{failed_count}}</li>
        <li>Started: {{start_time}}</li>
        <li>Failed at: {{end_time}}</li>
      </ul>
      
      <a href="{{report_link}}" class="btn">View Error Log</a>
    </div>
    <div class="footer">
      <p>This is an automated message from Ora2Pg Migration Tool</p>
    </div>
  </div>
</body>
</html>`,
    variables: defaultVariables.filter((v) =>
      [
        "project_name",
        "user_name",
        "error_message",
        "success_count",
        "total_tables",
        "failed_count",
        "start_time",
        "end_time",
        "report_link",
      ].includes(v.key),
    ),
    isActive: true,
    createdAt: new Date("2025-01-10"),
    updatedAt: new Date("2025-01-14"),
  },
  {
    id: "3",
    name: "Daily Summary Report",
    type: "daily_summary",
    subject: "[DAILY REPORT] Migration Summary for {{start_time}}",
    body: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #06b6d4, #0891b2); padding: 30px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .summary-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .summary-table th, .summary-table td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    .summary-table th { background: #f8fafc; color: #64748b; font-size: 12px; text-transform: uppercase; }
    .footer { background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Daily Migration Summary</h1>
    </div>
    <div class="content">
      <p>Hello {{user_name}},</p>
      <p>Here is your daily migration summary for <strong>{{start_time}}</strong>.</p>
      
      <table class="summary-table">
        <tr>
          <th>Metric</th>
          <th>Value</th>
        </tr>
        <tr>
          <td>Total Migrations Run</td>
          <td>{{total_tables}}</td>
        </tr>
        <tr>
          <td>Successful</td>
          <td>{{success_count}}</td>
        </tr>
        <tr>
          <td>Failed</td>
          <td>{{failed_count}}</td>
        </tr>
        <tr>
          <td>Total Rows Processed</td>
          <td>{{total_rows}}</td>
        </tr>
      </table>
      
      <p><a href="{{report_link}}">View Full Report →</a></p>
    </div>
    <div class="footer">
      <p>This is an automated message from Ora2Pg Migration Tool</p>
    </div>
  </div>
</body>
</html>`,
    variables: defaultVariables.filter((v) =>
      [
        "user_name",
        "start_time",
        "total_tables",
        "success_count",
        "failed_count",
        "total_rows",
        "report_link",
      ].includes(v.key),
    ),
    isActive: true,
    createdAt: new Date("2025-01-12"),
    updatedAt: new Date("2025-01-14"),
  },
]

export function EmailTemplatePage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>(mockTemplates)
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(mockTemplates[0])
  const [isEditing, setIsEditing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<EmailTemplateType | "all">("all")
  const [showPreview, setShowPreview] = useState(false)
  const [previewVariables, setPreviewVariables] = useState<Record<string, string>>({})
  const [showNewTemplateDialog, setShowNewTemplateDialog] = useState(false)
  const [showVariableEditor, setShowVariableEditor] = useState(false)

  // Initialize preview variables when template changes
  const initPreviewVariables = (template: EmailTemplate) => {
    const vars: Record<string, string> = {}
    template.variables.forEach((v) => {
      vars[v.key] = v.defaultValue
    })
    setPreviewVariables(vars)
  }

  // Render preview with variable substitution
  const renderPreview = (content: string) => {
    let result = content
    Object.entries(previewVariables).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{{${key}}}`, "g"), value)
    })
    return result
  }

  // Filter templates
  const filteredTemplates = templates.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === "all" || t.type === filterType
    return matchesSearch && matchesType
  })

  // Handle template selection
  const handleSelectTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template)
    setIsEditing(false)
    initPreviewVariables(template)
  }

  // Handle save template
  const handleSaveTemplate = () => {
    if (!selectedTemplate) return
    setTemplates(
      templates.map((t) => (t.id === selectedTemplate.id ? { ...selectedTemplate, updatedAt: new Date() } : t)),
    )
    setIsEditing(false)
  }

  // Handle create new template
  const handleCreateTemplate = (name: string, type: EmailTemplateType) => {
    const newTemplate: EmailTemplate = {
      id: Date.now().toString(),
      name,
      type,
      subject: `[${type.toUpperCase()}] {{project_name}}`,
      body: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; padding: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>{{project_name}}</h1>
    <p>Hello {{user_name}},</p>
    <p>Your email content here...</p>
  </div>
</body>
</html>`,
      variables: defaultVariables.slice(0, 3),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setTemplates([...templates, newTemplate])
    setSelectedTemplate(newTemplate)
    setShowNewTemplateDialog(false)
    setIsEditing(true)
  }

  // Handle delete template
  const handleDeleteTemplate = (id: string) => {
    setTemplates(templates.filter((t) => t.id !== id))
    if (selectedTemplate?.id === id) {
      setSelectedTemplate(templates[0] || null)
    }
  }

  // Handle add variable to template
  const handleAddVariable = (variable: TemplateVariable) => {
    if (!selectedTemplate) return
    if (selectedTemplate.variables.find((v) => v.key === variable.key)) return
    setSelectedTemplate({
      ...selectedTemplate,
      variables: [...selectedTemplate.variables, variable],
    })
  }

  // Handle remove variable from template
  const handleRemoveVariable = (variableId: string) => {
    if (!selectedTemplate) return
    setSelectedTemplate({
      ...selectedTemplate,
      variables: selectedTemplate.variables.filter((v) => v.id !== variableId),
    })
  }

  // Insert variable into editor
  const insertVariable = (key: string) => {
    if (!selectedTemplate) return
    const textarea = document.getElementById("template-body") as HTMLTextAreaElement
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const text = selectedTemplate.body
      const before = text.substring(0, start)
      const after = text.substring(end)
      setSelectedTemplate({
        ...selectedTemplate,
        body: `${before}{{${key}}}${after}`,
      })
    }
  }

  return (
    <div className="flex-1 p-6 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Email Templates</h1>
          <p className="text-muted-foreground mt-1">
            Design and manage notification email templates with configurable variables
          </p>
        </div>
        <Button onClick={() => setShowNewTemplateDialog(true)} className="gap-2">
          <PlusIcon className="w-4 h-4" />
          New Template
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Template List */}
        <div className="col-span-3 space-y-4">
          {/* Search & Filter */}
          <div className="space-y-3">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as EmailTemplateType | "all")}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
            >
              <option value="all">All Types</option>
              {Object.entries(templateTypeLabels).map(([key, { label }]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Template List */}
          <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-auto">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                onClick={() => handleSelectTemplate(template)}
                className={cn(
                  "p-3 rounded-lg border cursor-pointer transition-all",
                  selectedTemplate?.id === template.id
                    ? "bg-primary/10 border-primary"
                    : "bg-card border-border hover:border-primary/50",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <MailIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="font-medium text-sm text-foreground truncate">{template.name}</span>
                    </div>
                    <span
                      className={cn(
                        "inline-block mt-2 px-2 py-0.5 text-xs rounded-full",
                        templateTypeLabels[template.type].color,
                      )}
                    >
                      {templateTypeLabels[template.type].label}
                    </span>
                  </div>
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full shrink-0 mt-1",
                      template.isActive ? "bg-green-500" : "bg-gray-400",
                    )}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2 truncate">{template.subject}</p>
                <p className="text-xs text-muted-foreground mt-1">{template.variables.length} variables</p>
              </div>
            ))}
          </div>
        </div>

        {/* Template Editor */}
        <div className="col-span-6 space-y-4">
          {selectedTemplate ? (
            <>
              {/* Editor Header */}
              <div className="bg-card rounded-lg border border-border p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <MailIcon className="w-5 h-5 text-primary" />
                    {isEditing ? (
                      <Input
                        value={selectedTemplate.name}
                        onChange={(e) => setSelectedTemplate({ ...selectedTemplate, name: e.target.value })}
                        className="font-semibold"
                      />
                    ) : (
                      <h2 className="text-lg font-semibold text-foreground">{selectedTemplate.name}</h2>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                          <XIcon className="w-4 h-4 mr-1" />
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleSaveTemplate}>
                          <SaveIcon className="w-4 h-4 mr-1" />
                          Save
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowPreview(!showPreview)
                            initPreviewVariables(selectedTemplate)
                          }}
                        >
                          <PlayIcon className="w-4 h-4 mr-1" />
                          {showPreview ? "Hide Preview" : "Preview"}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                          <EditIcon className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => handleDeleteTemplate(selectedTemplate.id)}
                        >
                          <TrashIcon className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Template Type & Status */}
                <div className="flex items-center gap-4">
                  {isEditing ? (
                    <select
                      value={selectedTemplate.type}
                      onChange={(e) =>
                        setSelectedTemplate({ ...selectedTemplate, type: e.target.value as EmailTemplateType })
                      }
                      className="px-3 py-1.5 rounded-lg border border-input bg-background text-sm"
                    >
                      {Object.entries(templateTypeLabels).map(([key, { label }]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span
                      className={cn("px-2 py-1 text-xs rounded-full", templateTypeLabels[selectedTemplate.type].color)}
                    >
                      {templateTypeLabels[selectedTemplate.type].label}
                    </span>
                  )}
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedTemplate.isActive}
                      onChange={(e) =>
                        isEditing && setSelectedTemplate({ ...selectedTemplate, isActive: e.target.checked })
                      }
                      disabled={!isEditing}
                      className="rounded"
                    />
                    Active
                  </label>
                </div>
              </div>

              {/* Subject Line */}
              <div className="bg-card rounded-lg border border-border p-4">
                <Label className="text-sm font-medium text-muted-foreground mb-2 block">Subject Line</Label>
                {isEditing ? (
                  <Input
                    value={selectedTemplate.subject}
                    onChange={(e) => setSelectedTemplate({ ...selectedTemplate, subject: e.target.value })}
                    placeholder="Email subject with {{variables}}"
                  />
                ) : (
                  <p className="text-foreground">{selectedTemplate.subject}</p>
                )}
              </div>

              {/* Body Editor / Preview */}
              <div className="bg-card rounded-lg border border-border p-4">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-medium text-muted-foreground">Email Body (HTML)</Label>
                  {isEditing && (
                    <Button variant="ghost" size="sm" onClick={() => setShowVariableEditor(!showVariableEditor)}>
                      <PlusIcon className="w-4 h-4 mr-1" />
                      Insert Variable
                    </Button>
                  )}
                </div>

                {/* Variable Quick Insert */}
                {isEditing && showVariableEditor && (
                  <div className="mb-3 p-3 bg-muted/30 rounded-lg border border-border">
                    <p className="text-xs text-muted-foreground mb-2">Click to insert variable:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedTemplate.variables.map((v) => (
                        <button
                          key={v.id}
                          onClick={() => insertVariable(v.key)}
                          className="px-2 py-1 text-xs bg-primary/20 text-primary rounded hover:bg-primary/30 transition-colors"
                        >
                          {`{{${v.key}}}`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {showPreview ? (
                  <div className="border border-border rounded-lg overflow-hidden">
                    <div className="bg-muted/50 px-3 py-2 border-b border-border text-xs text-muted-foreground">
                      Preview with sample data
                    </div>
                    <iframe
                      srcDoc={renderPreview(selectedTemplate.body)}
                      className="w-full h-[400px] bg-white"
                      title="Email Preview"
                    />
                  </div>
                ) : isEditing ? (
                  <Textarea
                    id="template-body"
                    value={selectedTemplate.body}
                    onChange={(e) => setSelectedTemplate({ ...selectedTemplate, body: e.target.value })}
                    className="font-mono text-sm min-h-[400px]"
                  />
                ) : (
                  <pre className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-lg overflow-auto max-h-[400px] whitespace-pre-wrap">
                    {selectedTemplate.body}
                  </pre>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[400px] bg-card rounded-lg border border-border">
              <p className="text-muted-foreground">Select a template to edit</p>
            </div>
          )}
        </div>

        {/* Variables Panel */}
        <div className="col-span-3 space-y-4">
          {/* Template Variables */}
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Template Variables</h3>
              <span className="text-xs text-muted-foreground">{selectedTemplate?.variables.length || 0} used</span>
            </div>

            {selectedTemplate && (
              <div className="space-y-2 max-h-[200px] overflow-auto">
                {selectedTemplate.variables.map((v) => (
                  <div key={v.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                    <div>
                      <code className="text-xs text-primary">{`{{${v.key}}}`}</code>
                      <p className="text-xs text-muted-foreground mt-0.5">{v.name}</p>
                    </div>
                    {isEditing && (
                      <button
                        onClick={() => handleRemoveVariable(v.id)}
                        className="p-1 text-muted-foreground hover:text-destructive"
                      >
                        <XIcon className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Available Variables */}
          <div className="bg-card rounded-lg border border-border p-4">
            <h3 className="font-semibold text-foreground mb-4">Available Variables</h3>
            <div className="space-y-2 max-h-[300px] overflow-auto">
              {defaultVariables.map((v) => {
                const isUsed = selectedTemplate?.variables.find((tv) => tv.key === v.key)
                return (
                  <div
                    key={v.id}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-lg transition-colors",
                      isUsed ? "bg-primary/10" : "bg-muted/30 hover:bg-muted/50",
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <code className="text-xs text-primary">{`{{${v.key}}}`}</code>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{v.description}</p>
                    </div>
                    {isUsed ? (
                      <CheckIcon className="w-4 h-4 text-green-500 shrink-0" />
                    ) : (
                      <button
                        onClick={() => handleAddVariable(v)}
                        disabled={!isEditing}
                        className={cn(
                          "p-1 rounded transition-colors shrink-0",
                          isEditing ? "text-primary hover:bg-primary/20" : "text-muted-foreground cursor-not-allowed",
                        )}
                      >
                        <PlusIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Preview Variables */}
          {showPreview && selectedTemplate && (
            <div className="bg-card rounded-lg border border-border p-4">
              <h3 className="font-semibold text-foreground mb-4">Preview Values</h3>
              <div className="space-y-3 max-h-[250px] overflow-auto">
                {selectedTemplate.variables.map((v) => (
                  <div key={v.id}>
                    <Label className="text-xs text-muted-foreground">{v.name}</Label>
                    <Input
                      value={previewVariables[v.key] || ""}
                      onChange={(e) => setPreviewVariables({ ...previewVariables, [v.key]: e.target.value })}
                      className="mt-1 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Template Dialog */}
      {showNewTemplateDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg border border-border p-6 w-[400px]">
            <h3 className="text-lg font-semibold text-foreground mb-4">Create New Template</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                handleCreateTemplate(formData.get("name") as string, formData.get("type") as EmailTemplateType)
              }}
            >
              <div className="space-y-4">
                <div>
                  <Label>Template Name</Label>
                  <Input name="name" placeholder="e.g., Weekly Report" required className="mt-1" />
                </div>
                <div>
                  <Label>Template Type</Label>
                  <select
                    name="type"
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm"
                  >
                    {Object.entries(templateTypeLabels).map(([key, { label }]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button type="button" variant="ghost" onClick={() => setShowNewTemplateDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Template</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
