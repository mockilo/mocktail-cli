// Base schema parser interface and types for multi-schema support

export interface SchemaField {
  name: string;
  type: string;
  rawType: string;
  format?: string; // For JSON Schema formats, GraphQL directives, etc.
  isArray: boolean;
  isOptional: boolean;
  isScalar: boolean;
  isRelation: boolean;
  isId: boolean;
  isUnique: boolean;
  hasDefault: boolean;
  relationFromFields?: string[] | undefined;
  relationReferences?: string[] | undefined;
  relationName?: string | undefined;
  description?: string | undefined;
  constraints?: Record<string, any> | undefined;
}

export interface SchemaModel {
  name: string;
  fields: SchemaField[];
  modelLevelUniques: string[][];
  description?: string | undefined;
  constraints?: Record<string, any> | undefined;
}

export interface SchemaModelsMap {
  [modelName: string]: SchemaModel;
}

export interface SchemaValidation {
  valid: boolean;
  errors: string[];
  path: string;
  schemaType?: string;
}

export interface SchemaParser {
  /**
   * Parse a schema file and return a models map
   */
  parseSchema(schemaPath: string): SchemaModelsMap;
  
  /**
   * Validate a schema file
   */
  validateSchema(schemaPath: string): SchemaValidation;
  
  /**
   * Get the schema type this parser handles
   */
  getSchemaType(): string;
  
  /**
   * Get file extensions this parser can handle
   */
  getSupportedExtensions(): string[];
  
  /**
   * Check if this parser can handle the given file
   */
  canParse(filePath: string): boolean;
}

export interface SchemaDetector {
  /**
   * Detect schema type from file content or path
   */
  detectSchemaType(filePath: string, content?: string): string | null;
  
  /**
   * Find all schema files in a directory
   */
  findSchemaFiles(basePath: string): string[];
  
  /**
   * Get all supported schema types
   */
  getSupportedSchemaTypes(): string[];
}
