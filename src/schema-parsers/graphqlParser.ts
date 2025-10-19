import * as fs from 'fs';
import { SchemaParser, SchemaField, SchemaModelsMap, SchemaValidation } from './baseSchemaParser';

export class GraphQLSchemaParser implements SchemaParser {
  getSchemaType(): string {
    return 'graphql';
  }

  getSupportedExtensions(): string[] {
    return ['.graphql', '.gql'];
  }

  canParse(filePath: string): boolean {
    return filePath.endsWith('.graphql') || filePath.endsWith('.gql');
  }

  parseSchema(schemaPath: string): SchemaModelsMap {
    const content = fs.readFileSync(schemaPath, 'utf-8');
    return this.parseGraphQLSchema(content);
  }

  validateSchema(schemaPath: string): SchemaValidation {
    try {
      const content = fs.readFileSync(schemaPath, 'utf8');
      
      // Basic validation checks
      const hasTypes = /type\s+\w+\s*\{/.test(content) || /interface\s+\w+\s*\{/.test(content);
      const hasValidSyntax = this.isValidGraphQLSyntax(content);
      
      const errors: string[] = [];
      if (!hasTypes) errors.push('No type definitions found');
      if (!hasValidSyntax) errors.push('Invalid GraphQL syntax');
      
      return {
        valid: errors.length === 0,
        errors,
        path: schemaPath,
        schemaType: 'graphql'
      };
    } catch (err: any) {
      return {
        valid: false,
        errors: [`Cannot read schema file: ${err.message}`],
        path: schemaPath,
        schemaType: 'graphql'
      };
    }
  }

  private parseGraphQLSchema(content: string): SchemaModelsMap {
    const models: SchemaModelsMap = {};
    
    // Remove single-line comments to prevent regex issues
    const cleanContent = content.replace(/#[^\n]*/g, '');
    
    // Parse interface definitions first (before types)
    const interfaceRegex = /interface\s+(\w+)\s*\{([\s\S]*?)\}/g;
    let interfaceMatch: RegExpExecArray | null;
    
    while ((interfaceMatch = interfaceRegex.exec(cleanContent)) !== null) {
      const interfaceName = interfaceMatch[1];
      const interfaceBody = interfaceMatch[2];
      
      if (interfaceName && interfaceBody) {
        const fields = this.parseGraphQLFields(interfaceBody);
        
        models[interfaceName] = {
          name: interfaceName,
          fields,
          modelLevelUniques: []
        };
      }
    }
    
    // Parse type definitions (with optional directives and implements)
    // Match: type TypeName [implements Interface] [@directive] { ... }
    // Use non-greedy match [^{]*? to avoid capturing too much
    const typeRegex = /type\s+(\w+)(?:[^{]*?)\{([\s\S]*?)\}/g;
    let typeMatch: RegExpExecArray | null;
    
    while ((typeMatch = typeRegex.exec(cleanContent)) !== null) {
      const typeName = typeMatch[1];
      const typeBody = typeMatch[2];
      
      if (typeName && typeBody) {
        const fields = this.parseGraphQLFields(typeBody);
        
        models[typeName] = {
          name: typeName,
          fields,
          modelLevelUniques: []
        };
      }
    }

    return models;
  }

  private parseGraphQLFields(body: string): SchemaField[] {
    const fields: SchemaField[] = [];
    const lines = body.split('\n').map(l => l.trim()).filter(l => !!l && !l.startsWith('#'));
    
    for (const line of lines) {
      // Skip comments and standalone directives
      if (line.startsWith('#') || (line.startsWith('@') && !line.includes(':'))) continue;
      
      // Parse field definition: fieldName: Type! or fieldName: [Type!]! (with optional directives)
      // Match field name and type, ignoring any directives after the type
      const fieldMatch = line.match(/^(\w+)\s*:\s*([A-Za-z0-9\[\]!]+)/);
      if (!fieldMatch) continue;
      
      const fieldName = fieldMatch[1];
      const fieldType = fieldMatch[2];
      
      if (!fieldName || !fieldType) continue;
      
      // Parse type information
      let workingType = fieldType;
      
      // Check if the field itself is required (ends with !)
      const isRequired = fieldType.endsWith('!');
      const isOptional = !isRequired;
      
      // Remove outer ! if present
      if (isRequired) {
        workingType = workingType.slice(0, -1);
      }
      
      // Check if it's an array
      const isArray = workingType.startsWith('[') && workingType.endsWith(']');
      
      // Extract base type
      let baseType = workingType;
      if (isArray) {
        // Remove [ and ]
        baseType = workingType.slice(1, -1);
        // Remove inner ! if present (for [Type!] notation)
        if (baseType.endsWith('!')) {
          baseType = baseType.slice(0, -1);
        }
      }
      
      // Determine if it's a scalar or relation
      const builtInScalarTypes = new Set(['String', 'Int', 'Float', 'Boolean', 'ID']);
      const commonCustomScalars = new Set([
        'Date', 'DateTime', 'Time', 'JSON', 'UUID', 'URL', 'EmailAddress', 
        'PhoneNumber', 'PostalCode', 'CountryCode', 'Upload', 'BigInt'
      ]);
      
      // Check if it's a built-in scalar, custom scalar, or relation
      const isBuiltInScalar = builtInScalarTypes.has(baseType);
      const isCustomScalar = commonCustomScalars.has(baseType);
      const isScalar = isBuiltInScalar || isCustomScalar;
      const isRelation = !isScalar;
      
      const field: SchemaField = {
        name: fieldName,
        type: baseType,
        rawType: fieldType,
        isArray,
        isOptional,
        isScalar,
        isRelation,
        isId: baseType === 'ID',
        isUnique: false, // GraphQL doesn't have unique constraints in schema
        hasDefault: false, // GraphQL doesn't have default values in schema
        description: this.extractDescription(line)
      };
      
      fields.push(field);
    }
    
    return fields;
  }

  private extractDescription(_line: string): string | undefined {
    // Look for comments above the field
    // This is a simplified implementation
    return undefined;
  }

  private isValidGraphQLSyntax(content: string): boolean {
    // Basic GraphQL syntax validation
    const openBraces = (content.match(/\{/g) || []).length;
    const closeBraces = (content.match(/\}/g) || []).length;
    
    return openBraces === closeBraces;
  }
}
