import * as fs from 'fs';
import { SchemaParser, SchemaField, SchemaModelsMap, SchemaValidation } from './baseSchemaParser';

export class JsonSchemaParser implements SchemaParser {
  getSchemaType(): string {
    return 'json-schema';
  }

  getSupportedExtensions(): string[] {
    return ['.json'];
  }

  canParse(filePath: string): boolean {
    return filePath.endsWith('.json');
  }

  parseSchema(schemaPath: string): SchemaModelsMap {
    const content = fs.readFileSync(schemaPath, 'utf-8');
    const schema = JSON.parse(content);
    return this.parseJsonSchema(schema);
  }

  validateSchema(schemaPath: string): SchemaValidation {
    try {
      const content = fs.readFileSync(schemaPath, 'utf8');
      const schema = JSON.parse(content);
      
      const errors: string[] = [];
      
      // Check if it's a valid JSON Schema
      if (!schema.$schema && !schema.type) {
        errors.push('Not a valid JSON Schema - missing $schema or type');
      }
      
      // Check for required properties
      if (!schema.properties && !schema.definitions) {
        errors.push('No properties or definitions found');
      }
      
      return {
        valid: errors.length === 0,
        errors,
        path: schemaPath,
        schemaType: 'json-schema'
      };
    } catch (err: any) {
      return {
        valid: false,
        errors: [`Cannot parse JSON Schema: ${err.message}`],
        path: schemaPath,
        schemaType: 'json-schema'
      };
    }
  }

  private parseJsonSchema(schema: any): SchemaModelsMap {
    const models: SchemaModelsMap = {};
    
    // Handle root level object schema
    if (schema.type === 'object' && schema.properties) {
      const fields = this.parseJsonSchemaProperties(schema.properties, schema.required || []);
      models['Root'] = {
        name: 'Root',
        fields,
        modelLevelUniques: []
      };
    }
    
    // Handle definitions
    if (schema.definitions) {
      for (const [defName, defSchema] of Object.entries(schema.definitions)) {
        if (typeof defSchema === 'object' && defSchema !== null) {
          const def = defSchema as any;
          if (def.type === 'object' && def.properties) {
            const fields = this.parseJsonSchemaProperties(def.properties, def.required || []);
            models[defName] = {
              name: defName,
              fields,
              modelLevelUniques: []
            };
          }
        }
      }
    }
    
    return models;
  }

  private parseJsonSchemaProperties(properties: any, required: string[]): SchemaField[] {
    const fields: SchemaField[] = [];
    
    for (const [propName, propSchema] of Object.entries(properties)) {
      if (typeof propSchema === 'object' && propSchema !== null) {
        const prop = propSchema as any;
        const field = this.parseJsonSchemaProperty(propName, prop, required.includes(propName));
        fields.push(field);
      }
    }
    
    return fields;
  }

  private parseJsonSchemaProperty(name: string, prop: any, isRequired: boolean): SchemaField {
    const type = this.mapJsonSchemaType(prop.type);
    const isArray = prop.type === 'array';
    const isOptional = !isRequired;
    
    // For arrays, get the item type
    let baseType = type;
    if (isArray && prop.items) {
      baseType = this.mapJsonSchemaType(prop.items.type || 'string');
    }
    
    const scalarTypes = new Set(['string', 'number', 'integer', 'boolean', 'null']);
    const isScalar = scalarTypes.has(baseType);
    const isRelation = !isScalar;
    
    return {
      name,
      type: baseType,
      rawType: prop.type || 'string',
      isArray,
      isOptional,
      isScalar,
      isRelation,
      isId: name === 'id' || name === '_id',
      isUnique: !!prop.uniqueItems,
      hasDefault: prop.default !== undefined,
      description: prop.description,
      constraints: {
        minimum: prop.minimum,
        maximum: prop.maximum,
        minLength: prop.minLength,
        maxLength: prop.maxLength,
        pattern: prop.pattern,
        enum: prop.enum
      }
    };
  }

  private mapJsonSchemaType(jsonType: string): string {
    const typeMap: Record<string, string> = {
      'string': 'String',
      'number': 'Float',
      'integer': 'Int',
      'boolean': 'Boolean',
      'array': 'Array',
      'object': 'Object',
      'null': 'Null'
    };
    
    return typeMap[jsonType] || 'String';
  }
}
