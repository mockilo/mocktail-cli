import * as fs from 'fs';
import { SchemaParser, SchemaField, SchemaModelsMap, SchemaValidation } from './baseSchemaParser';

export class AvroParser implements SchemaParser {
  getSchemaType(): string {
    return 'avro';
  }

  getSupportedExtensions(): string[] {
    return ['.avsc', '.avro'];
  }

  canParse(filePath: string): boolean {
    return filePath.endsWith('.avsc') || filePath.endsWith('.avro');
  }

  parseSchema(schemaPath: string): SchemaModelsMap {
    const content = fs.readFileSync(schemaPath, 'utf-8');
    const schema = JSON.parse(content);
    return this.parseAvroSchema(schema);
  }

  validateSchema(schemaPath: string): SchemaValidation {
    try {
      const content = fs.readFileSync(schemaPath, 'utf8');
      const schema = JSON.parse(content);
      
      const errors: string[] = [];
      
      // Check if it's a valid Avro schema
      if (!schema.type && !schema.record) {
        errors.push('Not a valid Avro schema - missing type or record');
      }
      
      // Check for required properties
      if (!schema.fields && !schema.record) {
        errors.push('No fields or record found');
      }
      
      return {
        valid: errors.length === 0,
        errors,
        path: schemaPath,
        schemaType: 'avro'
      };
    } catch (err: any) {
      return {
        valid: false,
        errors: [`Cannot parse Avro schema: ${err.message}`],
        path: schemaPath,
        schemaType: 'avro'
      };
    }
  }

  private parseAvroSchema(schema: any): SchemaModelsMap {
    const models: SchemaModelsMap = {};
    
    // Handle record type
    if (schema.type === 'record' && schema.name && schema.fields) {
      const fields = this.parseAvroFields(schema.fields);
      models[schema.name] = {
        name: schema.name,
        fields,
        modelLevelUniques: []
      };
    }
    
    // Handle union types that might contain records
    if (schema.type === 'array' && schema.items) {
      this.parseAvroSchema(schema.items);
    }
    
    // Handle union types
    if (Array.isArray(schema)) {
      schema.forEach(item => {
        if (typeof item === 'object' && item.type === 'record') {
          const result = this.parseAvroSchema(item);
          Object.assign(models, result);
        }
      });
    }
    
    return models;
  }

  private parseAvroFields(fields: any[]): SchemaField[] {
    const schemaFields: SchemaField[] = [];
    
    for (const field of fields) {
      if (typeof field === 'object' && field.name) {
        const fieldName = field.name;
        const fieldType = this.getAvroTypeString(field.type);
        const isOptional = this.isOptionalType(field.type);
        const isArray = this.isArrayType(field.type);
        
        // Extract base type
        let baseType = fieldType;
        if (isArray) {
          baseType = this.getArrayElementType(field.type);
        }
        
        const scalarTypes = new Set(['string', 'int', 'long', 'float', 'double', 'boolean', 'bytes', 'null']);
        const isScalar = scalarTypes.has(baseType);
        const isRelation = !isScalar;
        
        schemaFields.push({
          name: fieldName,
          type: this.mapAvroType(baseType),
          rawType: fieldType,
          isArray,
          isOptional,
          isScalar,
          isRelation,
          isId: fieldName === 'id' || fieldName === '_id',
          isUnique: false,
          hasDefault: field.default !== undefined,
          description: field.doc,
          constraints: {
            default: field.default,
            aliases: field.aliases
          }
        });
      }
    }
    
    return schemaFields;
  }

  private getAvroTypeString(type: any): string {
    if (typeof type === 'string') {
      return type;
    } else if (typeof type === 'object') {
      if (type.type) {
        return type.type;
      } else if (Array.isArray(type)) {
        // Union type
        return type.map(t => this.getAvroTypeString(t)).join(' | ');
      }
    }
    return 'unknown';
  }

  private isOptionalType(type: any): boolean {
    if (Array.isArray(type)) {
      return type.includes('null');
    }
    return false;
  }

  private isArrayType(type: any): boolean {
    if (typeof type === 'object' && type.type === 'array') {
      return true;
    }
    if (Array.isArray(type)) {
      return type.some(t => typeof t === 'object' && t.type === 'array');
    }
    return false;
  }

  private getArrayElementType(type: any): string {
    if (typeof type === 'object' && type.type === 'array' && type.items) {
      return this.getAvroTypeString(type.items);
    }
    if (Array.isArray(type)) {
      const arrayType = type.find(t => typeof t === 'object' && t.type === 'array');
      if (arrayType && arrayType.items) {
        return this.getAvroTypeString(arrayType.items);
      }
    }
    return 'unknown';
  }

  private mapAvroType(avroType: string): string {
    const typeMap: Record<string, string> = {
      'string': 'String',
      'int': 'Int',
      'long': 'BigInt',
      'float': 'Float',
      'double': 'Float',
      'boolean': 'Boolean',
      'bytes': 'Bytes',
      'null': 'Null'
    };
    
    return typeMap[avroType] || avroType;
  }
}
