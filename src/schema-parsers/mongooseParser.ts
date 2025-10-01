import * as fs from 'fs';
import { SchemaParser, SchemaField, SchemaModelsMap, SchemaValidation } from './baseSchemaParser';

export class MongooseParser implements SchemaParser {
  getSchemaType(): string {
    return 'mongoose';
  }

  getSupportedExtensions(): string[] {
    return ['.js', '.ts'];
  }

  canParse(filePath: string): boolean {
    return filePath.endsWith('.js') || filePath.endsWith('.ts');
  }

  parseSchema(schemaPath: string): SchemaModelsMap {
    const content = fs.readFileSync(schemaPath, 'utf-8');
    return this.parseMongooseSchema(content);
  }

  validateSchema(schemaPath: string): SchemaValidation {
    try {
      const content = fs.readFileSync(schemaPath, 'utf8');
      
      // Basic validation checks
      const hasMongoose = /require\(['"]mongoose['"]\)|import.*mongoose|from\s+['"]mongoose['"]/.test(content);
      const hasSchema = /new\s+Schema\(|mongoose\.Schema\(/.test(content);
      const hasModel = /mongoose\.model\(|\.model\(/.test(content);
      
      const errors: string[] = [];
      if (!hasMongoose) errors.push('Not a Mongoose schema file - missing mongoose import');
      if (!hasSchema) errors.push('No Schema definitions found');
      if (!hasModel) errors.push('No Model definitions found');
      
      return {
        valid: errors.length === 0,
        errors,
        path: schemaPath,
        schemaType: 'mongoose'
      };
    } catch (err: any) {
      return {
        valid: false,
        errors: [`Cannot read Mongoose file: ${err.message}`],
        path: schemaPath,
        schemaType: 'mongoose'
      };
    }
  }

  private parseMongooseSchema(content: string): SchemaModelsMap {
    const models: SchemaModelsMap = {};
    
    // Parse model definitions with more flexible regex
    const modelRegex = /(?:mongoose\.)?model\(['"`]([^'"`]+)['"`]\s*,\s*([^)]+)\)/g;
    let match: RegExpExecArray | null;
    
    while ((match = modelRegex.exec(content)) !== null) {
      const modelName = match[1];
      const schemaRef = match[2];
      
      if (modelName && schemaRef) {
        // Find the schema definition
        const schemaDef = this.findSchemaDefinition(content, schemaRef);
        if (schemaDef) {
          const fields = this.parseSchemaFields(schemaDef);
          
          models[modelName] = {
            name: modelName,
            fields,
            modelLevelUniques: []
          };
        }
      }
    }
    
    // Also parse direct schema definitions
    const schemaRegex = /(?:const|let|var)\s+(\w+Schema)\s*=\s*new\s+Schema\(([\s\S]*?)\)/g;
    while ((match = schemaRegex.exec(content)) !== null) {
      const schemaName = match[1];
      const schemaDef = match[2];
      
      if (schemaName && schemaDef) {
        const fields = this.parseSchemaFields(schemaDef);
        const modelName = schemaName.replace('Schema', '');
        
        models[modelName] = {
          name: modelName,
          fields,
          modelLevelUniques: []
        };
      }
    }
    
    return models;
  }

  private findSchemaDefinition(content: string, schemaRef: string): string | null {
    // Look for schema variable definition
    const schemaVarRegex = new RegExp(`(?:const|let|var)\\s+${schemaRef}\\s*=\\s*new\\s+Schema\\(([\\s\\S]*?)\\)`, 'g');
    const match = schemaVarRegex.exec(content);
    
    if (match) {
      return match[1] || null;
    }
    
    // Look for inline schema definition
    const inlineRegex = new RegExp(`(?:const|let|var)\\s+${schemaRef}\\s*=\\s*new\\s+Schema\\(([\\s\\S]*?)\\)`, 'g');
    const inlineMatch = inlineRegex.exec(content);
    
    return inlineMatch ? (inlineMatch[1] || null) : null;
  }

  private parseSchemaFields(schemaDef: string): SchemaField[] {
    const fields: SchemaField[] = [];
    
    // Parse field definitions in the schema
    const fieldRegex = /(\w+):\s*\{([^}]*)\}/g;
    let match: RegExpExecArray | null;
    
    while ((match = fieldRegex.exec(schemaDef)) !== null) {
      const fieldName = match[1];
      const fieldDef = match[2];
      
      if (fieldName && fieldDef) {
        const field = this.parseFieldDefinition(fieldName, fieldDef);
        if (field) {
          fields.push(field);
        }
      }
    }
    
    return fields;
  }

  private parseFieldDefinition(fieldName: string, fieldDef: string): SchemaField | null {
    // Parse field type
    const typeMatch = fieldDef.match(/type:\s*(\w+)/);
      const fieldType = typeMatch ? (typeMatch[1] || 'String') : 'String';
    
    // Parse array type
    const isArray = /type:\s*\[/.test(fieldDef) || /Array/.test(fieldDef);
    
    // Parse required
    const isRequired = /required:\s*true/.test(fieldDef);
    
    // Parse unique
    const isUnique = /unique:\s*true/.test(fieldDef);
    
    // Parse default
    const hasDefault = /default:/.test(fieldDef);
    
    // Parse ref (relation)
    const hasRef = /ref:\s*['"`]([^'"`]+)['"`]/.test(fieldDef);
    const refMatch = fieldDef.match(/ref:\s*['"`]([^'"`]+)['"`]/);
    const refType = refMatch ? refMatch[1] : null;
    
    // Map Mongoose types to our schema types
    const mappedType = this.mapMongooseType(fieldType);
    const scalarTypes = new Set(['String', 'Number', 'Boolean', 'Date', 'Buffer', 'Mixed', 'ObjectId', 'Array']);
    const isScalar = scalarTypes.has(fieldType) || !hasRef;
    const isRelation = hasRef || (!isScalar && !scalarTypes.has(fieldType));
    
    return {
      name: fieldName,
      type: refType || mappedType,
      rawType: fieldType,
      isArray,
      isOptional: !isRequired,
      isScalar,
      isRelation,
      isId: fieldName === 'id' || fieldName === '_id' || fieldType === 'ObjectId',
      isUnique,
      hasDefault,
      description: this.extractComment(fieldDef),
      constraints: {
        ref: refType,
        required: isRequired,
        unique: isUnique,
        default: hasDefault
      }
    };
  }

  private mapMongooseType(mongooseType: string): string {
    const typeMap: Record<string, string> = {
      'String': 'String',
      'Number': 'Float',
      'Boolean': 'Boolean',
      'Date': 'DateTime',
      'Buffer': 'Bytes',
      'Mixed': 'Json',
      'ObjectId': 'String',
      'Array': 'Array'
    };
    
    return typeMap[mongooseType] || mongooseType;
  }

  private extractComment(fieldDef: string): string | undefined {
    const commentMatch = fieldDef.match(/comment:\s*['"`]([^'"`]*)['"`]/);
    return commentMatch ? commentMatch[1] : undefined;
  }
}
