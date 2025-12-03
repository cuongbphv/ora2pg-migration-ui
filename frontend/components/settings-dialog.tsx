"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CpuIcon, MailIcon, FileTextIcon, ZapIcon, SaveIcon, SearchIcon } from "./icons"
import type { AppSettings } from "@/lib/types"

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: AppSettings
  onSaveSettings: (settings: AppSettings) => void
}

const defaultSettings: AppSettings = {
  parallelJobs: 4,
  batchSize: 10000,
  commitInterval: 5000,
  smtpEnabled: false,
  smtpHost: "",
  smtpPort: 587,
  smtpUser: "",
  smtpPassword: "",
  smtpFromEmail: "",
  notifyOnComplete: true,
  notifyOnError: true,
  logLevel: "info",
  logRetentionDays: 30,
  logToFile: true,
  logFilePath: "/var/log/ora2pg",
  truncateTarget: false,
  disableConstraints: true,
  preserveSequences: true,
  skipErrors: false,
  maxErrors: 100,
  autoCommit: false,
  tableNameFilter: "",
}

export function SettingsDialog({
  open,
  onOpenChange,
  settings = defaultSettings,
  onSaveSettings,
}: SettingsDialogProps) {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings)
  const [saved, setSaved] = useState(false)

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const handleSave = () => {
    onSaveSettings(localSettings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-border max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Configure migration tool settings and preferences</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="performance" className="mt-4">
          <TabsList className="grid w-full grid-cols-5 bg-muted/30">
            <TabsTrigger value="performance" className="text-xs">
              <CpuIcon className="w-3 h-3 mr-1" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="smtp" className="text-xs">
              <MailIcon className="w-3 h-3 mr-1" />
              SMTP
            </TabsTrigger>
            <TabsTrigger value="logging" className="text-xs">
              <FileTextIcon className="w-3 h-3 mr-1" />
              Logging
            </TabsTrigger>
            <TabsTrigger value="discovery" className="text-xs">
              <SearchIcon className="w-3 h-3 mr-1" />
              Discovery
            </TabsTrigger>
            <TabsTrigger value="migration" className="text-xs">
              <ZapIcon className="w-3 h-3 mr-1" />
              Migration
            </TabsTrigger>
          </TabsList>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-4 mt-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="parallelJobs">Parallel Jobs</Label>
                <Input
                  id="parallelJobs"
                  type="number"
                  min={1}
                  max={32}
                  value={localSettings.parallelJobs}
                  onChange={(e) => updateSetting("parallelJobs", Number.parseInt(e.target.value) || 1)}
                  className="bg-input border-border"
                />
                <p className="text-xs text-muted-foreground">Number of tables to migrate simultaneously (1-32)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="batchSize">Batch Size</Label>
                <Input
                  id="batchSize"
                  type="number"
                  min={100}
                  max={100000}
                  value={localSettings.batchSize}
                  onChange={(e) => updateSetting("batchSize", Number.parseInt(e.target.value) || 1000)}
                  className="bg-input border-border"
                />
                <p className="text-xs text-muted-foreground">Number of rows to process per batch (100-100000)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="commitInterval">Commit Interval</Label>
                <Input
                  id="commitInterval"
                  type="number"
                  min={100}
                  max={50000}
                  value={localSettings.commitInterval}
                  onChange={(e) => updateSetting("commitInterval", Number.parseInt(e.target.value) || 1000)}
                  className="bg-input border-border"
                />
                <p className="text-xs text-muted-foreground">Number of rows before committing transaction</p>
              </div>
            </div>
          </TabsContent>

          {/* SMTP Tab */}
          <TabsContent value="smtp" className="space-y-4 mt-4">
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div>
                <Label>Enable Email Notifications</Label>
                <p className="text-xs text-muted-foreground">Send email alerts for migration events</p>
              </div>
              <Switch
                checked={localSettings.smtpEnabled}
                onCheckedChange={(checked) => updateSetting("smtpEnabled", checked)}
              />
            </div>

            {localSettings.smtpEnabled && (
              <div className="grid gap-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtpHost">SMTP Host</Label>
                    <Input
                      id="smtpHost"
                      placeholder="smtp.example.com"
                      value={localSettings.smtpHost}
                      onChange={(e) => updateSetting("smtpHost", e.target.value)}
                      className="bg-input border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpPort">SMTP Port</Label>
                    <Input
                      id="smtpPort"
                      type="number"
                      placeholder="587"
                      value={localSettings.smtpPort}
                      onChange={(e) => updateSetting("smtpPort", Number.parseInt(e.target.value) || 587)}
                      className="bg-input border-border"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtpUser">SMTP Username</Label>
                    <Input
                      id="smtpUser"
                      placeholder="username"
                      value={localSettings.smtpUser}
                      onChange={(e) => updateSetting("smtpUser", e.target.value)}
                      className="bg-input border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpPassword">SMTP Password</Label>
                    <Input
                      id="smtpPassword"
                      type="password"
                      placeholder="••••••••"
                      value={localSettings.smtpPassword}
                      onChange={(e) => updateSetting("smtpPassword", e.target.value)}
                      className="bg-input border-border"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtpFromEmail">From Email</Label>
                  <Input
                    id="smtpFromEmail"
                    type="email"
                    placeholder="noreply@example.com"
                    value={localSettings.smtpFromEmail}
                    onChange={(e) => updateSetting("smtpFromEmail", e.target.value)}
                    className="bg-input border-border"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                  <Label>Notify on completion</Label>
                  <Switch
                    checked={localSettings.notifyOnComplete}
                    onCheckedChange={(checked) => updateSetting("notifyOnComplete", checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                  <Label>Notify on error</Label>
                  <Switch
                    checked={localSettings.notifyOnError}
                    onCheckedChange={(checked) => updateSetting("notifyOnError", checked)}
                  />
                </div>
              </div>
            )}
          </TabsContent>

          {/* Logging Tab */}
          <TabsContent value="logging" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Log Level</Label>
              <Select
                value={localSettings.logLevel}
                onValueChange={(value: "debug" | "info" | "warning" | "error") => updateSetting("logLevel", value)}
              >
                <SelectTrigger className="bg-input border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="debug">Debug</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="logRetention">Log Retention (days)</Label>
              <Input
                id="logRetention"
                type="number"
                min={1}
                max={365}
                value={localSettings.logRetentionDays}
                onChange={(e) => updateSetting("logRetentionDays", Number.parseInt(e.target.value) || 30)}
                className="bg-input border-border"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div>
                <Label>Log to File</Label>
                <p className="text-xs text-muted-foreground">Save logs to disk</p>
              </div>
              <Switch
                checked={localSettings.logToFile}
                onCheckedChange={(checked) => updateSetting("logToFile", checked)}
              />
            </div>

            {localSettings.logToFile && (
              <div className="space-y-2">
                <Label htmlFor="logFilePath">Log File Path</Label>
                <Input
                  id="logFilePath"
                  placeholder="/var/log/ora2pg"
                  value={localSettings.logFilePath}
                  onChange={(e) => updateSetting("logFilePath", e.target.value)}
                  className="bg-input border-border"
                />
              </div>
            )}
          </TabsContent>

          {/* Discovery Tab */}
          <TabsContent value="discovery" className="space-y-4 mt-4">
            <div className="space-y-1">
              <Label>Table Name Filter</Label>
              <Input
                value={localSettings.tableNameFilter || ""}
                onChange={(e) => updateSetting("tableNameFilter", e.target.value)}
                placeholder="e.g., TRADE_%"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                SQL LIKE pattern for filtering tables during discovery. Use % as wildcard. Example: TRADE_% to discover only tables starting with TRADE_
              </p>
            </div>
          </TabsContent>

          {/* Migration Tab */}
          <TabsContent value="migration" className="space-y-4 mt-4">
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div>
                <Label>Truncate Target Tables</Label>
                <p className="text-xs text-muted-foreground">Clear target tables before migration</p>
              </div>
              <Switch
                checked={localSettings.truncateTarget}
                onCheckedChange={(checked) => updateSetting("truncateTarget", checked)}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div>
                <Label>Disable Constraints</Label>
                <p className="text-xs text-muted-foreground">Disable FK constraints during migration</p>
              </div>
              <Switch
                checked={localSettings.disableConstraints}
                onCheckedChange={(checked) => updateSetting("disableConstraints", checked)}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div>
                <Label>Preserve Sequences</Label>
                <p className="text-xs text-muted-foreground">Keep sequence values from source</p>
              </div>
              <Switch
                checked={localSettings.preserveSequences}
                onCheckedChange={(checked) => updateSetting("preserveSequences", checked)}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div>
                <Label>Skip Errors</Label>
                <p className="text-xs text-muted-foreground">Continue migration on row errors</p>
              </div>
              <Switch
                checked={localSettings.skipErrors}
                onCheckedChange={(checked) => updateSetting("skipErrors", checked)}
              />
            </div>

            {localSettings.skipErrors && (
              <div className="space-y-2">
                <Label htmlFor="maxErrors">Max Errors Before Stop</Label>
                <Input
                  id="maxErrors"
                  type="number"
                  min={1}
                  max={10000}
                  value={localSettings.maxErrors}
                  onChange={(e) => updateSetting("maxErrors", Number.parseInt(e.target.value) || 100)}
                  className="bg-input border-border"
                />
              </div>
            )}

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div>
                <Label>Auto Commit</Label>
                <p className="text-xs text-muted-foreground">
                  Enable auto-commit mode (each statement commits immediately). 
                  Disable for manual transaction control (recommended for better performance and error handling).
                </p>
              </div>
              <Switch
                checked={localSettings.autoCommit}
                onCheckedChange={(checked) => updateSetting("autoCommit", checked)}
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="gap-2">
            <SaveIcon className="w-4 h-4" />
            {saved ? "Saved!" : "Save Settings"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export { defaultSettings }
