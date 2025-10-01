import * as fs from "fs";
import * as path from "path";

/**
 * Escape values properly for SQL inserts
 */
function escapeValue(value: any): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "string") {
    // Escape single quotes by doubling them
    return `'${value.replace(/'/g, "''")}'`;
  }
  if (typeof value === "boolean") {
    return value ? "TRUE" : "FALSE";
  }
  if (value instanceof Date) {
    return `'${value.toISOString()}'`;
  }
  return value.toString();
}

/**
 * Generate SQL INSERT statements for a model and array of records
 */
function generateSqlInsertStatements(modelName: string, data: Record<string, any>[]): string {
  if (data.length === 0) return "";

  // Use keys from the first record (assumes consistent shape)
  const columns = Object.keys(data[0] || {});

  // Create VALUES rows, escaping each value properly
  const valuesRows = data.map((record) => {
    const values = columns.map((col) => escapeValue(record[col]));
    return `(${values.join(", ")})`;
  });

  const sql = `INSERT INTO "${modelName}" (${columns.map((c) => `"${c}"`).join(", ")}) VALUES\n${valuesRows.join(",\n")};\n`;
  return sql;
}

/**
 * Write mock data array to file in specified format.
 * Supports json, csv, ts (typescript export), and sql formats.
 * 
 * @param modelName - Name of the model (used for filename and ts export)
 * @param data - Array of mock data objects
 * @param outDir - Output directory path
 * @param format - File format: "json" | "csv" | "ts" | "sql" (default: json)
 * @param pretty - Whether to pretty-print JSON output
 * @returns Full path to the written file
 */
export function writeMockDataToFile(
  modelName: string, 
  data: Record<string, any>[], 
  outDir: string, 
  format: string = "json", 
  pretty: boolean = true
): string {
  const fullPath = path.join(outDir, `${modelName}.${format}`);

  switch (format) {
    case "json":
      const jsonString = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
      fs.writeFileSync(fullPath, jsonString, "utf8");
      break;

    case "csv":
      if (data.length === 0) {
        fs.writeFileSync(fullPath, "", "utf8");
        break;
      }

      const headers = Array.from(
        data.reduce((acc: Set<string>, obj) => {
          Object.keys(obj).forEach((key) => acc.add(key));
          return acc;
        }, new Set<string>())
      );

      const csvRows = data.map((obj) =>
        headers
          .map((header) => {
            let val = obj[header];
            if (val !== null && typeof val === "object") {
              val = JSON.stringify(val);
            }
            return `"${String(val ?? "").replace(/"/g, '""')}"`;
          })
          .join(",")
      );

      fs.writeFileSync(fullPath, headers.join(",") + "\n" + csvRows.join("\n"), "utf8");
      break;

    case "ts":
      const tsContent = `export const ${modelName} = ${JSON.stringify(data, null, 2)};\n`;
      fs.writeFileSync(fullPath, tsContent, "utf8");
      break;

    case "sql":
      const sqlContent = generateSqlInsertStatements(modelName, data);
      fs.writeFileSync(fullPath, sqlContent, "utf8");
      break;

    default:
      throw new Error(`Unsupported format: ${format}`);
  }

  return fullPath;
}
