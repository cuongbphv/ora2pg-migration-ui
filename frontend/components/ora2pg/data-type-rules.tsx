"use client"

import { useState, useEffect } from "react"
import type { DataTypeMapping } from "@/lib/types"
import { defaultDataTypeMappings } from "@/lib/data-type-mappings"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SearchIcon, PlusIcon, ArrowRightIcon, OracleIcon, PostgresIcon, AlertIcon } from "../icons"
import { Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { apiService } from "@/lib/api"
import { toast } from "@/lib/toast"
import { DataTypeRuleModal } from "./data-type-rule-modal"

export function DataTypeRules() {
  const [searchTerm, setSearchTerm] = useState("")
  const [mappings, setMappings] = useState<DataTypeMapping[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedRule, setSelectedRule] = useState<DataTypeMapping | null>(null)

  const categories = [
    { id: "all", label: "All Types" },
    { id: "numeric", label: "Numeric" },
    { id: "character", label: "Character" },
    { id: "datetime", label: "Date/Time" },
    { id: "binary", label: "Binary" },
    { id: "other", label: "Other" },
  ]

  const getCategoryForType = (oracleType: string): string => {
    const type = oracleType.toUpperCase()
    if (type.includes("NUMBER") || type.includes("FLOAT") || type.includes("INTEGER") || type.includes("BINARY_")) {
      return "numeric"
    }
    if (
      type.includes("VARCHAR") ||
      type.includes("CHAR") ||
      type.includes("CLOB") ||
      type.includes("LONG") ||
      type.includes("TEXT")
    ) {
      return "character"
    }
    if (type.includes("DATE") || type.includes("TIME") || type.includes("INTERVAL")) {
      return "datetime"
    }
    if (type.includes("BLOB") || type.includes("RAW") || type.includes("BFILE")) {
      return "binary"
    }
    return "other"
  }

  useEffect(() => {
    loadMappings()
  }, [])

  const loadMappings = async () => {
    setLoading(true)
    try {
      const result = await apiService.getDataTypeRules()
      if (result.data) {
        // Merge with defaults if API doesn't return all
        const apiMappings = result.data as DataTypeMapping[]
        // Combine defaults and custom rules, with custom rules taking precedence
        const defaultMap = new Map(defaultDataTypeMappings.map(m => [m.oracleType, m]))
        const customMap = new Map(apiMappings.filter(m => (m as any).isCustom).map(m => [m.oracleType, m]))
        
        // Start with defaults, then override with custom rules
        const combined = [...defaultDataTypeMappings]
        apiMappings.filter(m => (m as any).isCustom).forEach(custom => {
          const index = combined.findIndex(d => d.oracleType === custom.oracleType)
          if (index >= 0) {
            combined[index] = custom
          } else {
            combined.push(custom)
          }
        })
        
        setMappings(combined)
      } else if (result.error) {
        // Fallback to defaults on error
        setMappings(defaultDataTypeMappings)
        toast.error("Failed to load rules", result.error)
      }
    } catch (error) {
      // Fallback to defaults on error
      setMappings(defaultDataTypeMappings)
      toast.error("Failed to load rules", error instanceof Error ? error.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  const handleAddRule = () => {
    setSelectedRule(null)
    setModalOpen(true)
  }

  const handleEditRule = (rule: DataTypeMapping) => {
    setSelectedRule(rule)
    setModalOpen(true)
  }

  const handleDeleteRule = async (rule: DataTypeMapping) => {
    if (!(rule as any).id || !(rule as any).isCustom) {
      toast.warn("Cannot delete", "Only custom rules can be deleted")
      return
    }

    if (!confirm(`Are you sure you want to delete the mapping rule for ${rule.oracleType}?`)) {
      return
    }

    try {
      const result = await apiService.deleteDataTypeRule((rule as any).id)
      if (!result.error) {
        toast.success("Rule deleted", "Data type mapping rule deleted successfully")
        loadMappings()
      } else {
        toast.error("Failed to delete rule", result.error)
      }
    } catch (error) {
      toast.error("Failed to delete rule", error instanceof Error ? error.message : "Unknown error")
    }
  }

  const filteredMappings = mappings.filter((mapping) => {
    const matchesSearch =
      mapping.oracleType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mapping.postgresType.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || getCategoryForType(mapping.oracleType) === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Data Type Mapping Rules</h1>
          <p className="text-muted-foreground">Configure Oracle to PostgreSQL data type conversions</p>
        </div>
        <Button size="sm" onClick={handleAddRule}>
          <PlusIcon className="w-4 h-4 mr-2" />
          Add Custom Rule
        </Button>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={cn(
              "px-3 py-1.5 text-sm rounded-md transition-colors",
              selectedCategory === cat.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search data types..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-input border-border"
        />
      </div>

      {/* Mapping Rules */}
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {/* Header */}
            <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-muted/30 text-sm font-medium text-muted-foreground">
              <div className="col-span-3 flex items-center gap-2">
                <OracleIcon className="w-4 h-4 text-oracle" />
                Oracle Type
              </div>
              <div className="col-span-1 text-center">→</div>
              <div className="col-span-3 flex items-center gap-2">
                <PostgresIcon className="w-4 h-4 text-postgres" />
                PostgreSQL Type
              </div>
              <div className="col-span-4">Description</div>
              <div className="col-span-1">Actions</div>
            </div>

            {/* Mappings */}
            {loading ? (
              <div className="px-4 py-8 text-center text-muted-foreground">
                Loading mapping rules...
              </div>
            ) : filteredMappings.length === 0 ? (
              <div className="px-4 py-8 text-center text-muted-foreground">
                No mapping rules found
              </div>
            ) : (
              filteredMappings.map((mapping, index) => {
                const isCustom = (mapping as any).isCustom === true
                const hasId = !!(mapping as any).id
                return (
                  <div
                    key={(mapping as any).id || index}
                    className={cn(
                      "grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-muted/20 transition-colors",
                      isCustom && "bg-primary/5"
                    )}
                  >
                    <div className="col-span-3">
                      <div className="flex items-center gap-2">
                        <code className="px-2 py-1 bg-oracle/10 text-oracle rounded text-sm font-mono">
                          {mapping.oracleType}
                        </code>
                        {isCustom && (
                          <span className="text-xs px-1.5 py-0.5 bg-primary/20 text-primary rounded">
                            Custom
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <ArrowRightIcon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="col-span-3">
                      <code className="px-2 py-1 bg-postgres/10 text-postgres rounded text-sm font-mono">
                        {mapping.postgresType}
                      </code>
                    </div>
                    <div className="col-span-4">
                      <p className="text-sm text-muted-foreground">{mapping.description}</p>
                      {mapping.transformationHint && (
                        <p className="text-xs text-warning flex items-center gap-1 mt-1">
                          <AlertIcon className="w-3 h-3" />
                          {mapping.transformationHint}
                        </p>
                      )}
                    </div>
                    <div className="col-span-1 flex gap-1">
                      {hasId && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 px-2"
                          onClick={() => handleEditRule(mapping)}
                        >
                          Edit
                        </Button>
                      )}
                      {isCustom && hasId && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 px-2 text-red-500 hover:text-red-600"
                          onClick={() => handleDeleteRule(mapping)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-muted/30 border-border">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <AlertIcon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Data Type Mapping Rules</p>
              <p className="text-sm text-muted-foreground mt-1">
                These are the Oracle to PostgreSQL data type conversion rules. Custom rules (highlighted) take precedence over
                defaults. Some conversions may require manual data transformation or validation.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal */}
      <DataTypeRuleModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        rule={selectedRule}
        onSuccess={loadMappings}
      />
    </div>
  )
}
