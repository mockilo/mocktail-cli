import * as fs from 'fs';
import { SchemaParser, SchemaField, SchemaModelsMap, SchemaValidation } from './baseSchemaParser';

export class JoiParser implements SchemaParser {
  getSchemaType(): string {
    return 'joi';
  }

  getSupportedExtensions(): string[] {
    return ['.js', '.ts'];
  }

  canParse(filePath: string): boolean {
    return filePath.endsWith('.js') || filePath.endsWith('.ts');
  }

  parseSchema(schemaPath: string): SchemaModelsMap {
    const content = fs.readFileSync(schemaPath, 'utf-8');
    return this.parseJoiSchema(content);
  }

  validateSchema(schemaPath: string): SchemaValidation {
    try {
      const content = fs.readFileSync(schemaPath, 'utf8');
      
      // Basic validation checks
      const hasJoi = /require\(['"]joi['"]\)|import.*joi|from\s+['"]joi['"]/.test(content);
      const hasSchema = /Joi\.object\(|\.object\(/.test(content);
      const hasDefine = /\.define\(/.test(content);
      
      const errors: string[] = [];
      if (!hasJoi) errors.push('Not a Joi schema file - missing joi import');
      if (!hasSchema && !hasDefine) errors.push('No schema definitions found');
      
      return {
        valid: errors.length === 0,
        errors,
        path: schemaPath,
        schemaType: 'joi'
      };
    } catch (err: any) {
      return {
        valid: false,
        errors: [`Cannot read Joi file: ${err.message}`],
        path: schemaPath,
        schemaType: 'joi'
      };
    }
  }

  private parseJoiSchema(content: string): SchemaModelsMap {
    const models: SchemaModelsMap = {};
    
    // Parse schema definitions
    const schemaRegex = /(?:const|let|var)\s+(\w+)\s*=\s*Joi\.object\(([\s\S]*?)\)/g;
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
    const defineRegex = /(?:const|let|var)\s+(\w+)\s*=\s*Joi\.define\([\s\S]*?keys:\s*\{([\s\S]*?)\}/g;
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
    const fieldRegex = /(\w+):\s*Joi\.(\w+)\([^)]*\)(?:\.(\w+)\([^)]*\))*/g;
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
    const fieldRegex = new RegExp(`${fieldName}:\\s*Joi\\.${fieldType}\\([^)]*\\)`, 'g');
    const fieldMatch = fieldRegex.exec(schemaDef);
    const isRequired = fieldMatch ? !/\.optional\(\)/.test(fieldMatch[0]) : true;
    
    // Parse unique
    const isUnique = fieldMatch ? /\.unique\(\)/.test(fieldMatch[0]) : false;
    
    // Parse default
    const hasDefault = fieldMatch ? /\.default\(/.test(fieldMatch[0]) : false;
    
    // Map Joi types to our schema types
    const mappedType = this.mapJoiType(fieldType);
    const scalarTypes = new Set(['string', 'number', 'boolean', 'date', 'binary', 'any', 'alternatives']);
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

  private mapJoiType(joiType: string): string {
    const typeMap: Record<string, string> = {
      'string': 'String',
      'number': 'Float',
      'boolean': 'Boolean',
      'date': 'DateTime',
      'binary': 'Bytes',
      'any': 'Any',
      'alternatives': 'Any',
      'array': 'Array',
      'object': 'Object'
    };
    
    return typeMap[joiType] || joiType;
  }

  private extractComment(fieldDef: string): string | undefined {
    const commentMatch = fieldDef.match(/\.description\(['"`]([^'"`]*)['"`]\)/);
    return commentMatch ? commentMatch[1] : undefined;
  }
}
