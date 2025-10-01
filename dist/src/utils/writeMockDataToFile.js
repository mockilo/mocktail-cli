"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeMockDataToFile = writeMockDataToFile;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Escape values properly for SQL inserts
 */
function escapeValue(value) {
    if (value === null || value === undefined)
        return "NULL";
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
function generateSqlInsertStatements(modelName, data) {
    if (data.length === 0)
        return "";
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
function writeMockDataToFile(modelName, data, outDir, format = "json", pretty = true) {
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
            const headers = Array.from(data.reduce((acc, obj) => {
                Object.keys(obj).forEach((key) => acc.add(key));
                return acc;
            }, new Set()));
            const csvRows = data.map((obj) => headers
                .map((header) => {
                let val = obj[header];
                if (val !== null && typeof val === "object") {
                    val = JSON.stringify(val);
                }
                return `"${String(val ?? "").replace(/"/g, '""')}"`;
            })
                .join(","));
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
