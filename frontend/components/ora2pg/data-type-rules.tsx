"use client"

import { useState } from "react"
import type { DataTypeMapping } from "@/lib/types"
import { defaultDataTypeMappings } from "@/lib/data-type-mappings"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SearchIcon, PlusIcon, ArrowRightIcon, OracleIcon, PostgresIcon, AlertIcon } from "../icons"
import { cn } from "@/lib/utils"

export function DataTypeRules() {
  const [searchTerm, setSearchTerm] = useState("")
  const [mappings, setMappings] = useState<DataTypeMapping[]>(defaultDataTypeMappings)
  const [selectedCategory, setSelectedCategory] = useState<string>("all")

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
        <Button size="sm">
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
            {filteredMappings.map((mapping, index) => (
              <div
                key={index}
                className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-muted/20 transition-colors"
              >
                <div className="col-span-3">
                  <code className="px-2 py-1 bg-oracle/10 text-oracle rounded text-sm font-mono">
                    {mapping.oracleType}
                  </code>
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
                <div className="col-span-1">
                  <Button variant="ghost" size="sm" className="h-7 px-2">
                    Edit
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-muted/30 border-border">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <AlertIcon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Default Mapping Rules</p>
              <p className="text-sm text-muted-foreground mt-1">
                These are the default Oracle to PostgreSQL data type conversion rules. Custom rules take precedence over
                defaults. Some conversions may require manual data transformation or validation.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
