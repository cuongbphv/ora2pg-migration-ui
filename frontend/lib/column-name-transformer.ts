/**
 * Utility functions for transforming column names based on different naming strategies.
 * Matches the backend ColumnNameTransformer logic.
 */

export type ColumnNamingStrategy = "lowercase" | "uppercase" | "original" | "camelCase" | "snake_case" | "pascalCase"

/**
 * Transforms a column name according to the specified strategy.
 * 
 * @param columnName The original column name (typically UPPERCASE from Oracle)
 * @param strategy The naming strategy to apply
 * @returns The transformed column name
 */
export function transformColumnName(columnName: string, strategy: ColumnNamingStrategy = "lowercase"): string {
  if (!columnName || columnName.length === 0) {
    return columnName
  }

  switch (strategy) {
    case "lowercase":
      return columnName.toLowerCase()
    case "uppercase":
      return columnName.toUpperCase()
    case "original":
      return columnName // Keep as-is
    case "camelCase":
      return toCamelCase(columnName)
    case "snake_case":
      return toSnakeCase(columnName)
    case "pascalCase":
      return toPascalCase(columnName)
    default:
      return columnName.toLowerCase() // Fallback to lowercase
  }
}

/**
 * Converts a column name to camelCase.
 * Example: "USER_ID" -> "userId", "FIRST_NAME" -> "firstName"
 */
function toCamelCase(columnName: string): string {
  const normalized = normalizeToWords(columnName)
  if (!normalized) {
    return columnName.toLowerCase()
  }

  const words = normalized.split("_")
  if (words.length === 0) {
    return columnName.toLowerCase()
  }

  let result = words[0].toLowerCase()
  for (let i = 1; i < words.length; i++) {
    if (words[i].length > 0) {
      const word = words[i].toLowerCase()
      result += word.charAt(0).toUpperCase() + word.slice(1)
    }
  }
  return result
}

/**
 * Converts a column name to snake_case.
 * Example: "USER_ID" -> "user_id", "FirstName" -> "first_name"
 */
function toSnakeCase(columnName: string): string {
  const normalized = normalizeToWords(columnName)
  if (!normalized) {
    return columnName.toLowerCase()
  }

  // If already contains underscores, just lowercase
  if (normalized.includes("_")) {
    return normalized.toLowerCase()
  }

  // Convert camelCase/PascalCase to snake_case
  let result = ""
  for (let i = 0; i < normalized.length; i++) {
    const c = normalized[i]
    if (c === c.toUpperCase() && i > 0) {
      result += "_"
    }
    result += c.toLowerCase()
  }
  return result
}

/**
 * Converts a column name to PascalCase.
 * Example: "USER_ID" -> "UserId", "first_name" -> "FirstName"
 */
function toPascalCase(columnName: string): string {
  const normalized = normalizeToWords(columnName)
  if (!normalized) {
    return capitalizeFirst(columnName)
  }

  const words = normalized.split("_")
  return words
    .filter((word) => word.length > 0)
    .map((word) => {
      const lower = word.toLowerCase()
      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join("")
}

/**
 * Normalizes a column name to a consistent format with underscores.
 * Handles various input formats: UPPERCASE, lowercase, camelCase, PascalCase, etc.
 */
function normalizeToWords(columnName: string): string {
  if (!columnName || columnName.length === 0) {
    return ""
  }

  // If already contains underscores, preserve them
  if (columnName.includes("_")) {
    return columnName.toUpperCase().replace(/\s+/g, "_")
  }

  // Convert camelCase/PascalCase to underscore-separated
  let result = ""
  for (let i = 0; i < columnName.length; i++) {
    const c = columnName[i]
    if (c === c.toUpperCase() && i > 0 && columnName[i - 1] === columnName[i - 1].toLowerCase()) {
      result += "_"
    }
    result += c.toUpperCase()
  }
  return result
}

/**
 * Capitalizes the first letter of a string.
 */
function capitalizeFirst(str: string): string {
  if (!str || str.length === 0) {
    return str
  }
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

