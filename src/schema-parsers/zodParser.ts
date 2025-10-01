import * as fs from 'fs';
import { SchemaParser, SchemaField, SchemaModelsMap, SchemaValidation } from './baseSchemaParser';

export class ZodParser implements SchemaParser {
  getSchemaType(): string {
    return 'zod';
  }

  getSupportedExtensions(): string[] {
    return ['.ts', '.js'];
  }

  canParse(filePath: string): boolean {
    return filePath.endsWith('.ts') || filePath.endsWith('.js');
  }

  parseSchema(schemaPath: string): SchemaModelsMap {
    const content = fs.readFileSync(schemaPath, 'utf-8');
    return this.parseZodSchema(content);
  }

  validateSchema(schemaPath: string): SchemaValidation {
    try {
      const content = fs.readFileSync(schemaPath, 'utf8');
      
      // Basic validation checks
      const hasZod = /require\(['"]zod['"]\)|import.*zod|from\s+['"]zod['"]/.test(content);
      const hasSchema = /z\.object\(|\.object\(/.test(content);
      const hasDefine = /\.define\(/.test(content);
      
      const errors: string[] = [];
      if (!hasZod) errors.push('Not a Zod schema file - missing zod import');
      if (!hasSchema && !hasDefine) errors.push('No schema definitions found');
      
      return {
        valid: errors.length === 0,
        errors,
        path: schemaPath,
        schemaType: 'zod'
      };
    } catch (err: any) {
      return {
        valid: false,
        errors: [`Cannot read Zod file: ${err.message}`],
        path: schemaPath,
        schemaType: 'zod'
      };
    }
  }

  private parseZodSchema(content: string): SchemaModelsMap {
    const models: SchemaModelsMap = {};
    
    // Parse schema definitions
    const schemaRegex = /(?:const|let|var)\s+(\w+)\s*=\s*z\.object\(([\s\S]*?)\)/g;
    let match: RegExpExecArray | null;
    
    while ((match = schemaRegex.exec(content)) !== null) {
      const schemaName = match[1];
      const schemaDef = match[2];
      
      if (schemaName && schemaDef) {
        const fields = this.parseSchemaFields(schemaDef);
        
        models[schemaName] = {
          name: schemaName,
          fields,
          modelLevelUniques: []
        };
      }
    }
    
    // Parse schema definitions with define()
    const defineRegex = /(?:const|let|var)\s+(\w+)\s*=\s*z\.define\([\s\S]*?keys:\s*\{([\s\S]*?)\}/g;
    while ((match = defineRegex.exec(content)) !== null) {
      const schemaName = match[1];
      const schemaDef = match[2];
      
      if (schemaName && schemaDef) {
        const fields = this.parseSchemaFields(schemaDef);
        
        models[schemaName] = {
          name: schemaName,
          fields,
          modelLevelUniques: []
        };
      }
    }
    
    return models;
  }

  private parseSchemaFields(schemaDef: string): SchemaField[] {
    const fields: SchemaField[] = [];
    
    // Parse field definitions with more comprehensive regex
    const fieldRegex = /(\w+):\s*z\.(\w+)\([^)]*\)(?:\.(\w+)\([^)]*\))*/g;
    let match: RegExpExecArray | null;
    
    while ((match = fieldRegex.exec(schemaDef)) !== null) {
      const fieldName = match[1];
      const fieldType = match[2];
      const modifiers = match[3];
      
      if (fieldName && fieldType) {
        const field = this.parseFieldDefinition(fieldName, fieldType, schemaDef, modifiers);
        if (field) {
          fields.push(field);
        }
      }
    }
    
    return fields;
  }

  private parseFieldDefinition(fieldName: string, fieldType: string, schemaDef: string, modifiers?: string): SchemaField | null {
    // Parse array type
    const isArray = fieldType === 'array';
    
    // Parse required
    const fieldRegex = new RegExp(`${fieldName}:\\s*z\\.${fieldType}\\([^)]*\\)`, 'g');
    const fieldMatch = fieldRegex.exec(schemaDef);
    const isRequired = fieldMatch ? !/\.optional\(\)/.test(fieldMatch[0]) : true;
    
    // Parse unique
    const isUnique = fieldMatch ? /\.unique\(\)/.test(fieldMatch[0]) : false;
    
    // Parse default
    const hasDefault = fieldMatch ? /\.default\(/.test(fieldMatch[0]) : false;
    
    // Map Zod types to our schema types
    const mappedType = this.mapZodType(fieldType);
    const scalarTypes = new Set(['string', 'number', 'boolean', 'date', 'any', 'unknown']);
    const isScalar = scalarTypes.has(fieldType);
    const isRelation = !isScalar;
    
    return {
      name: fieldName,
      type: mappedType,
      rawType: fieldType + (modifiers ? `.${modifiers}` : ''),
      isArray,
      isOptional: !isRequired,
      isScalar,
      isRelation,
      isId: fieldName === 'id' || fieldName === '_id',
      isUnique,
      hasDefault,
      description: this.extractComment(fieldMatch?.[0] || ''),
      constraints: {
        required: isRequired,
        unique: isUnique,
        default: hasDefault,
        modifiers: modifiers
      }
    };
  }

  private mapZodType(zodType: string): string {
    const typeMap: Record<string, string> = {
      'string': 'String',
      'number': 'Float',
      'boolean': 'Boolean',
      'date': 'DateTime',
      'any': 'Any',
      'unknown': 'Any',
      'array': 'Array',
      'object': 'Object'
    };
    
    return typeMap[zodType] || zodType;
  }

  private extractComment(fieldDef: string): string | undefined {
    const commentMatch = fieldDef.match(/\.describe\(['"`]([^'"`]*)['"`]\)/);
    return commentMatch ? commentMatch[1] : undefined;
  }
}
