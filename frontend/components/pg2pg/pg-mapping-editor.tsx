"use client"

import { useState } from "react"
import { Plus, Trash2, X } from "lucide-react"
import type { TableMappingV2, ColumnMappingV2, TransformationType } from "@/lib/pg-migration-types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import TransformationEditor from "./pg-transformation-editor"

const pgDataTypes = [
  "VARCHAR",
  "VARCHAR(255)",
  "TEXT",
  "INTEGER",
  "BIGINT",
  "SMALLINT",
  "DECIMAL",
  "NUMERIC(38,2)",
  "FLOAT",
  "BOOLEAN",
  "DATE",
  "TIMESTAMP",
  "TIMESTAMP(6)",
  "TIME",
  "INTERVAL",
  "UUID",
  "JSON",
  "JSONB",
  "ARRAY",
]

const transformationTypes: { value: TransformationType; label: string; icon: string }[] = [
  { value: "direct", label: "Direct Mapping", icon: "→" },
  { value: "case-when", label: "CASE WHEN", icon: "◇" },
  { value: "subquery", label: "Subquery", icon: "∴" },
  { value: "function", label: "Function", icon: "ƒ" },
  { value: "static", label: "Static Value", icon: "★" },
  { value: "concat", label: "Concatenate", icon: "⋃" },
  { value: "type-cast", label: "Type Cast", icon: "∿" },
  { value: "coalesce", label: "Coalesce", icon: "∅" },
]

interface MappingEditorProps {
  step: TableMappingV2
  onSave: (updated: TableMappingV2) => void
  onCancel: () => void
}

export default function MappingEditor({ step, onSave, onCancel }: MappingEditorProps) {
  const [edited, setEdited] = useState(step)
  const [editingColumn, setEditingColumn] = useState<ColumnMappingV2 | null>(null)
  const [showTransformEditor, setShowTransformEditor] = useState(false)

  const addColumn = () => {
    const newColumn: ColumnMappingV2 = {
      id: Date.now().toString(),
      sourceColumn: "",
      sourceDataType: "",
      targetColumn: "",
      targetDataType: "VARCHAR",
      transformationType: "direct",
      nullable: true,
      isPrimaryKey: false,
      isForeignKey: false,
    }
    setEdited({
      ...edited,
      columnMappings: [...edited.columnMappings, newColumn],
    })
    setEditingColumn(newColumn)
  }

  const updateColumn = (updated: ColumnMappingV2) => {
    setEdited({
      ...edited,
      columnMappings: edited.columnMappings.map((c) => (c.id === updated.id ? updated : c)),
    })
  }

  const deleteColumn = (id: string) => {
    setEdited({
      ...edited,
      columnMappings: edited.columnMappings.filter((c) => c.id !== id),
    })
    setEditingColumn(null)
  }

  return (
    <Card className="border-accent/30 bg-background/60 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Edit Mapping: {edited.targetTable}</CardTitle>
            <CardDescription>Configure column mappings and transformations</CardDescription>
          </div>
          <Button onClick={onCancel} variant="ghost" size="sm" className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Source/Target */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-foreground/60 uppercase tracking-wider">Source Table</label>
            <input
              type="text"
              value={edited.sourceTable}
              onChange={(e) => setEdited({ ...edited, sourceTable: e.target.value })}
              className="w-full mt-1 px-3 py-2 bg-background border border-foreground/10 rounded text-sm"
              placeholder="source_table"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground/60 uppercase tracking-wider">Target Table</label>
            <input
              type="text"
              value={edited.targetTable}
              onChange={(e) => setEdited({ ...edited, targetTable: e.target.value })}
              className="w-full mt-1 px-3 py-2 bg-background border border-foreground/10 rounded text-sm"
              placeholder="target_table"
            />
          </div>
        </div>

        {/* Column Mappings Table */}
        <div className="border-t border-foreground/10 pt-4">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-semibold text-foreground/60 uppercase tracking-wider">Columns</label>
            <Button
              onClick={addColumn}
              variant="outline"
              size="sm"
              className="h-7 text-xs border-accent/50 hover:bg-accent/10 bg-transparent"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Column
            </Button>
          </div>

          {editingColumn ? (
            <div className="space-y-3 mb-4 p-3 border border-accent/30 rounded-lg bg-accent/5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground/60">Source Column</label>
                  <input
                    type="text"
                    value={editingColumn.sourceColumn}
                    onChange={(e) => setEditingColumn({ ...editingColumn, sourceColumn: e.target.value })}
                    className="w-full mt-1 px-2 py-1 bg-background border border-foreground/10 rounded text-xs"
                    placeholder="COLUMN_NAME"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground/60">Source Type</label>
                  <input
                    type="text"
                    value={editingColumn.sourceDataType}
                    onChange={(e) => setEditingColumn({ ...editingColumn, sourceDataType: e.target.value })}
                    className="w-full mt-1 px-2 py-1 bg-background border border-foreground/10 rounded text-xs"
                    placeholder="VARCHAR2(100)"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground/60">Target Column</label>
                  <input
                    type="text"
                    value={editingColumn.targetColumn}
                    onChange={(e) => setEditingColumn({ ...editingColumn, targetColumn: e.target.value })}
                    className="w-full mt-1 px-2 py-1 bg-background border border-foreground/10 rounded text-xs"
                    placeholder="column_name"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground/60">Target Type</label>
                  <select
                    value={editingColumn.targetDataType}
                    onChange={(e) => setEditingColumn({ ...editingColumn, targetDataType: e.target.value })}
                    className="w-full mt-1 px-2 py-1 bg-background border border-foreground/10 rounded text-xs"
                  >
                    {pgDataTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Transformation Type */}
              <div>
                <label className="text-xs font-semibold text-foreground/60 mb-2 block">Transformation</label>
                <div className="grid grid-cols-4 gap-2">
                  {transformationTypes.map((type) => (
                    <button
                      key={type.value}
                      onClick={() =>
                        setEditingColumn({
                          ...editingColumn,
                          transformationType: type.value,
                        })
                      }
                      className={`px-2 py-1 rounded text-xs border transition-all ${
                        editingColumn.transformationType === type.value
                          ? "border-accent bg-accent/20 text-accent"
                          : "border-foreground/10 hover:border-accent/50"
                      }`}
                    >
                      <div className="text-lg">{type.icon}</div>
                      <div>{type.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Transformation Query */}
              {editingColumn.transformationType !== "direct" && (
                <TransformationEditor column={editingColumn} onChange={(updated) => setEditingColumn(updated)} />
              )}

              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    updateColumn(editingColumn)
                    setEditingColumn(null)
                  }}
                  size="sm"
                  className="flex-1 bg-accent hover:bg-accent/90"
                >
                  Save Column
                </Button>
                <Button onClick={() => setEditingColumn(null)} variant="outline" size="sm" className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}

          {/* Columns List */}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {edited.columnMappings.map((col) => (
              <div
                key={col.id}
                onClick={() => setEditingColumn(col)}
                className="p-2 border border-foreground/10 rounded hover:border-accent/30 cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono">
                      <span className="text-accent">{col.sourceColumn}</span>
                      <span className="text-foreground/30 mx-1">→</span>
                      <span>{col.targetColumn}</span>
                    </div>
                    <div className="text-xs text-foreground/50 mt-0.5">
                      {transformationTypes.find((t) => t.value === col.transformationType)?.label}
                    </div>
                  </div>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteColumn(col.id)
                    }}
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                  >
                    <Trash2 className="h-3 w-3 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-foreground/10 pt-4 flex gap-2">
          <Button onClick={() => onSave(edited)} className="flex-1 bg-accent hover:bg-accent/90">
            Save Mapping
          </Button>
          <Button onClick={onCancel} variant="outline" className="flex-1 bg-transparent">
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
