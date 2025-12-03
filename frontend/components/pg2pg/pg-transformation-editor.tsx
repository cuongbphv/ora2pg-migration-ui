"use client"

import type { ColumnMappingV2, TransformationType } from "@/lib/pg-migration-types"
import { Textarea } from "@/components/ui/textarea"

const transformationTemplates: Record<TransformationType, { template: string; example: string }> = {
  direct: {
    template: '"COLUMN_NAME"',
    example: '"FIRST_NAME"',
  },
  "case-when": {
    template: "CASE WHEN \"COL1\" = 'A' THEN 'value1' WHEN \"COL2\" = 'B' THEN 'value2' ELSE 'default' END",
    example: "CASE WHEN \"STATUS\" IN ('ACT', 'DEL') THEN 'ACTIVE' ELSE 'INACTIVE' END",
  },
  subquery: {
    template: "(SELECT column FROM schema.table WHERE join_condition)",
    example: "(SELECT country_code_id FROM public.country_codes WHERE code = source_table.country_cd)",
  },
  function: {
    template: "function_name(parameters)",
    example: "source_schema.gen_uuid() or TO_TIMESTAMP(\"DATE_COL\", 'DD-MON-YY')",
  },
  static: {
    template: "'static_value'",
    example: "'IL' or 'A1'",
  },
  concat: {
    template: "CONCAT_WS(separator, col1, col2, col3)",
    example: 'CONCAT_WS(\',\', "FIRST_NAME", "LAST_NAME")',
  },
  "type-cast": {
    template: '"COLUMN"::target_type',
    example: '"AMOUNT"::numeric or "ID"::integer',
  },
  coalesce: {
    template: "COALESCE(col1, col2, default_value)",
    example: 'COALESCE("EMAIL", "ALT_EMAIL", \'no-email\')',
  },
}

interface TransformationEditorProps {
  column: ColumnMappingV2
  onChange: (updated: ColumnMappingV2) => void
}

export default function TransformationEditor({ column, onChange }: TransformationEditorProps) {
  const template = transformationTemplates[column.transformationType]

  return (
    <div className="space-y-2">
      <div>
        <label className="text-xs font-semibold text-foreground/60 mb-2 block">Transformation Query</label>
        <Textarea
          value={column.transformation || ""}
          onChange={(e) => onChange({ ...column, transformation: e.target.value })}
          placeholder={template.example}
          className="min-h-24 font-mono text-xs bg-background border border-foreground/10 text-foreground"
        />
      </div>
      <div className="p-2 bg-foreground/5 border border-foreground/10 rounded text-xs space-y-1">
        <p className="text-foreground/60">
          <span className="font-semibold">Template:</span>
        </p>
        <code className="block text-accent break-words">{template.template}</code>
        <p className="text-foreground/60 mt-2">
          <span className="font-semibold">Example:</span>
        </p>
        <code className="block text-accent break-words">{template.example}</code>
      </div>
    </div>
  )
}
