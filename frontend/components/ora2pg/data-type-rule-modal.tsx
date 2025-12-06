"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { apiService } from "@/lib/api"
import { toast } from "@/lib/toast"
import type { DataTypeMapping } from "@/lib/types"

interface DataTypeRuleModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rule?: DataTypeMapping | null
  onSuccess?: () => void
}

export function DataTypeRuleModal({ open, onOpenChange, rule, onSuccess }: DataTypeRuleModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    oracleType: "",
    postgresType: "",
    description: "",
    transformationHint: "",
  })

  useEffect(() => {
    if (rule) {
      setFormData({
        oracleType: rule.oracleType || "",
        postgresType: rule.postgresType || "",
        description: rule.description || "",
        transformationHint: rule.transformationHint || "",
      })
    } else {
      setFormData({
        oracleType: "",
        postgresType: "",
        description: "",
        transformationHint: "",
      })
    }
  }, [rule, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.oracleType.trim() || !formData.postgresType.trim()) {
      toast.error("Oracle Type and PostgreSQL Type are required")
      return
    }

    setLoading(true)
    try {
      if (rule && (rule as any).id) {
        // Update existing rule
        const result = await apiService.updateDataTypeRule((rule as any).id, formData)
        if (result.data) {
          toast.success("Rule updated", "Data type mapping rule updated successfully")
          onOpenChange(false)
          onSuccess?.()
        } else if (result.error) {
          toast.error("Failed to update rule", result.error)
        }
      } else {
        // Create new rule
        const result = await apiService.createDataTypeRule(formData)
        if (result.data) {
          toast.success("Rule created", "Data type mapping rule created successfully")
          onOpenChange(false)
          onSuccess?.()
        } else if (result.error) {
          toast.error("Failed to create rule", result.error)
        }
      }
    } catch (error) {
      toast.error("Failed to save rule", error instanceof Error ? error.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{rule && (rule as any).id ? "Edit Mapping Rule" : "Add Custom Mapping Rule"}</DialogTitle>
          <DialogDescription>
            {rule && (rule as any).id 
              ? "Update the data type mapping rule. Custom rules take precedence over defaults."
              : "Create a custom Oracle to PostgreSQL data type mapping rule. This will override default mappings for the specified Oracle type."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="oracleType">Oracle Type *</Label>
            <Input
              id="oracleType"
              placeholder="e.g., VARCHAR2(255), NUMBER(10,2)"
              value={formData.oracleType}
              onChange={(e) => setFormData({ ...formData, oracleType: e.target.value })}
              disabled={loading || (rule && !(rule as any).isCustom)}
              required
            />
            <p className="text-xs text-muted-foreground">
              The Oracle data type to map from
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="postgresType">PostgreSQL Type *</Label>
            <Input
              id="postgresType"
              placeholder="e.g., VARCHAR(255), NUMERIC(10,2)"
              value={formData.postgresType}
              onChange={(e) => setFormData({ ...formData, postgresType: e.target.value })}
              disabled={loading || (rule && !(rule as any).isCustom)}
              required
            />
            <p className="text-xs text-muted-foreground">
              The PostgreSQL data type to map to
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe this mapping rule..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={loading || (rule && !(rule as any).isCustom)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="transformationHint">Transformation Hint</Label>
            <Textarea
              id="transformationHint"
              placeholder="Optional hint about data transformation requirements..."
              value={formData.transformationHint}
              onChange={(e) => setFormData({ ...formData, transformationHint: e.target.value })}
              disabled={loading || (rule && !(rule as any).isCustom)}
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              Additional information about any required data transformation
            </p>
          </div>

          {rule && !(rule as any).isCustom && (
            <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground">
              This is a system default rule and cannot be edited. Create a custom rule to override it.
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || (rule && !(rule as any).isCustom)}>
              {loading ? "Saving..." : rule && (rule as any).id ? "Update Rule" : "Create Rule"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}



