import type { DataTypeMapping } from "./types"

export const defaultDataTypeMappings: DataTypeMapping[] = [
  // Numeric Types
  { oracleType: "NUMBER", postgresType: "NUMERIC", description: "Exact numeric with precision and scale" },
  { oracleType: "NUMBER(p)", postgresType: "NUMERIC(p)", description: "Exact numeric with precision" },
  { oracleType: "NUMBER(p,s)", postgresType: "NUMERIC(p,s)", description: "Exact numeric with precision and scale" },
  { oracleType: "BINARY_FLOAT", postgresType: "REAL", description: "32-bit floating point" },
  { oracleType: "BINARY_DOUBLE", postgresType: "DOUBLE PRECISION", description: "64-bit floating point" },
  { oracleType: "FLOAT", postgresType: "DOUBLE PRECISION", description: "Floating point number" },
  { oracleType: "INTEGER", postgresType: "INTEGER", description: "32-bit integer" },
  { oracleType: "SMALLINT", postgresType: "SMALLINT", description: "16-bit integer" },

  // Character Types
  { oracleType: "VARCHAR2(n)", postgresType: "VARCHAR(n)", description: "Variable-length character string" },
  { oracleType: "CHAR(n)", postgresType: "CHAR(n)", description: "Fixed-length character string" },
  { oracleType: "NVARCHAR2(n)", postgresType: "VARCHAR(n)", description: "Variable-length Unicode string" },
  { oracleType: "NCHAR(n)", postgresType: "CHAR(n)", description: "Fixed-length Unicode string" },
  { oracleType: "CLOB", postgresType: "TEXT", description: "Large text object" },
  { oracleType: "NCLOB", postgresType: "TEXT", description: "Large Unicode text object" },
  { oracleType: "LONG", postgresType: "TEXT", description: "Variable-length character data (deprecated)" },

  // Date/Time Types
  {
    oracleType: "DATE",
    postgresType: "TIMESTAMP",
    description: "Date and time",
    transformationHint: "Oracle DATE includes time component",
  },
  { oracleType: "TIMESTAMP", postgresType: "TIMESTAMP", description: "Timestamp without timezone" },
  { oracleType: "TIMESTAMP WITH TIME ZONE", postgresType: "TIMESTAMPTZ", description: "Timestamp with timezone" },
  {
    oracleType: "TIMESTAMP WITH LOCAL TIME ZONE",
    postgresType: "TIMESTAMPTZ",
    description: "Timestamp with local timezone",
  },
  { oracleType: "INTERVAL YEAR TO MONTH", postgresType: "INTERVAL", description: "Year-month interval" },
  { oracleType: "INTERVAL DAY TO SECOND", postgresType: "INTERVAL", description: "Day-second interval" },

  // Binary Types
  { oracleType: "BLOB", postgresType: "BYTEA", description: "Binary large object" },
  { oracleType: "RAW(n)", postgresType: "BYTEA", description: "Raw binary data" },
  { oracleType: "LONG RAW", postgresType: "BYTEA", description: "Variable-length raw binary data (deprecated)" },
  {
    oracleType: "BFILE",
    postgresType: "BYTEA",
    description: "External binary file",
    transformationHint: "Requires data extraction",
  },

  // Other Types
  { oracleType: "ROWID", postgresType: "VARCHAR(18)", description: "Row identifier" },
  { oracleType: "UROWID", postgresType: "VARCHAR(4000)", description: "Universal row identifier" },
  { oracleType: "XMLTYPE", postgresType: "XML", description: "XML data" },
  {
    oracleType: "SDO_GEOMETRY",
    postgresType: "GEOMETRY",
    description: "Spatial data",
    transformationHint: "Requires PostGIS extension",
  },
  { oracleType: "BOOLEAN", postgresType: "BOOLEAN", description: "Boolean value" },
]

export const oracleToPostgresTypes = defaultDataTypeMappings

export function getPostgresType(oracleType: string): string {
  const mapping = defaultDataTypeMappings.find(
    (m) =>
      m.oracleType.toUpperCase() === oracleType.toUpperCase() ||
      oracleType.toUpperCase().startsWith(m.oracleType.split("(")[0]),
  )
  return mapping?.postgresType || "TEXT"
}
