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
export declare function writeMockDataToFile(modelName: string, data: Record<string, any>[], outDir: string, format?: string, pretty?: boolean): string;
