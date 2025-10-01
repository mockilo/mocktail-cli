import * as fs from 'fs';
import * as yaml from 'yaml';
import { SchemaParser, SchemaField, SchemaModelsMap, SchemaValidation } from './baseSchemaParser';

export class OpenAPISchemaParser implements SchemaParser {
  getSchemaType(): string {
    return 'openapi';
  }

  getSupportedExtensions(): string[] {
    return ['.yaml', '.yml', '.json'];
  }

  canParse(filePath: string): boolean {
    return filePath.endsWith('.yaml') || filePath.endsWith('.yml') || filePath.endsWith('.json');
  }

  parseSchema(schemaPath: string): SchemaModelsMap {
    const content = fs.readFileSync(schemaPath, 'utf-8');
    const schema = this.parseYamlOrJson(content);
    return this.parseOpenAPISchema(schema);
  }

  validateSchema(schemaPath: string): SchemaValidation {
    try {
      const content = fs.readFileSync(schemaPath, 'utf8');
      const schema = this.parseYamlOrJson(content);
      
      const errors: string[] = [];
      
      // Check if it's a valid OpenAPI spec
      if (!schema.openapi && !schema.swagger) {
        errors.push('Not a valid OpenAPI specification - missing openapi or swagger field');
      }
      
      // Check for required properties
      if (!schema.components && !schema.definitions) {
        errors.push('No components or definitions found');
      }
      
      return {
        valid: errors.length === 0,
        errors,
        path: schemaPath,
        schemaType: 'openapi'
      };
    } catch (err: any) {
      return {
        valid: false,
        errors: [`Cannot parse OpenAPI specification: ${err.message}`],
        path: schemaPath,
        schemaType: 'openapi'
      };
    }
  }

  private parseYamlOrJson(content: string): any {
    // Try JSON first
    try {
      return JSON.parse(content);
    } catch {
      // Try YAML using the yaml library
      try {
        return yaml.parse(content);
      } catch (err) {
        throw new Error(`Failed to parse as JSON or YAML: ${err}`);
      }
    }
  }


  private parseOpenAPISchema(schema: any): SchemaModelsMap {
    const models: SchemaModelsMap = {};
    
    // Handle OpenAPI 3.x components
    if (schema.components && schema.components.schemas) {
      for (const [schemaName, schemaDef] of Object.entries(schema.components.schemas)) {
        if (typeof schemaDef === 'object' && schemaDef !== null) {
          const def = schemaDef as any;
          if (def.type === 'object' && def.properties) {
            const fields = this.parseOpenAPIProperties(def.properties, def.required || []);
            models[schemaName] = {
              name: schemaName,
              fields,
              modelLevelUniques: []
            };
          }
        }
      }
    }
    
    // Handle Swagger 2.x definitions
    if (schema.definitions) {
      for (const [defName, defSchema] of Object.entries(schema.definitions)) {
        if (typeof defSchema === 'object' && defSchema !== null) {
          const def = defSchema as any;
          if (def.type === 'object' && def.properties) {
            const fields = this.parseOpenAPIProperties(def.properties, def.required || []);
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

  private parseOpenAPIProperties(properties: any, required: string[]): SchemaField[] {
    const fields: SchemaField[] = [];
    
    for (const [propName, propSchema] of Object.entries(properties)) {
      if (typeof propSchema === 'object' && propSchema !== null) {
        const prop = propSchema as any;
        const field = this.parseOpenAPIProperty(propName, prop, required.includes(propName));
        fields.push(field);
      }
    }
    
    return fields;
  }

  private parseOpenAPIProperty(name: string, prop: any, isRequired: boolean): SchemaField {
    const type = this.mapOpenAPIType(prop.type);
    const isArray = prop.type === 'array';
    const isOptional = !isRequired;
    
    // For arrays, get the item type
    let baseType = type;
    if (isArray && prop.items) {
      baseType = this.mapOpenAPIType(prop.items.type || 'string');
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
        enum: prop.enum,
        format: prop.format
      }
    };
  }

  private mapOpenAPIType(openapiType: string): string {
    const typeMap: Record<string, string> = {
      'string': 'String',
      'number': 'Float',
      'integer': 'Int',
      'boolean': 'Boolean',
      'array': 'Array',
      'object': 'Object',
      'null': 'Null'
    };
    
    return typeMap[openapiType] || 'String';
  }
}
