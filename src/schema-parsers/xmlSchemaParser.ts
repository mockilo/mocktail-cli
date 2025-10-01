import * as fs from 'fs';
import * as xml2js from 'xml2js';
import { SchemaParser, SchemaField, SchemaModelsMap, SchemaValidation } from './baseSchemaParser';

export class XMLSchemaParser implements SchemaParser {
  getSchemaType(): string {
    return 'xml-schema';
  }

  getSupportedExtensions(): string[] {
    return ['.xsd'];
  }

  canParse(filePath: string): boolean {
    return filePath.endsWith('.xsd');
  }

  parseSchema(schemaPath: string): SchemaModelsMap {
    const content = fs.readFileSync(schemaPath, 'utf-8');
    return this.parseXMLSchemaSync(content);
  }

  validateSchema(schemaPath: string): SchemaValidation {
    try {
      const content = fs.readFileSync(schemaPath, 'utf8');
      
      // Basic validation checks
      const hasSchema = /<xs:schema/.test(content) || /<schema/.test(content);
      const hasElements = /<xs:element/.test(content) || /<element/.test(content);
      
      const errors: string[] = [];
      if (!hasSchema) errors.push('Not a valid XML Schema - missing schema element');
      if (!hasElements) errors.push('No element definitions found');
      
      return {
        valid: errors.length === 0,
        errors,
        path: schemaPath,
        schemaType: 'xml-schema'
      };
    } catch (err: any) {
      return {
        valid: false,
        errors: [`Cannot read XML Schema file: ${err.message}`],
        path: schemaPath,
        schemaType: 'xml-schema'
      };
    }
  }

  private parseXMLSchemaSync(content: string): SchemaModelsMap {
    const models: SchemaModelsMap = {};
    
    try {
      const parser = new xml2js.Parser({
        explicitArray: false,
        mergeAttrs: true
      });
      
      let result: any;
      parser.parseString(content, (err: any, data: any) => {
        if (err) throw err;
        result = data;
      });
      
      if (!result) {
        return this.parseXMLSchemaRegex(content);
      }
      
      const schema = result['xs:schema'] || result.schema;
      
      if (schema && schema['xs:element']) {
        const elements = Array.isArray(schema['xs:element']) ? schema['xs:element'] : [schema['xs:element']];
        
        for (const element of elements) {
          if (element.name && element.type) {
            const fields = this.parseComplexType(element, schema);
            
            models[element.name] = {
              name: element.name,
              fields,
              modelLevelUniques: []
            };
          }
        }
      }
      
      return models;
    } catch (err) {
      // Fallback to regex parsing if XML parsing fails
      return this.parseXMLSchemaRegex(content);
    }
  }

  private parseXMLSchemaRegex(content: string): SchemaModelsMap {
    const models: SchemaModelsMap = {};
    
    // Parse complex types
    const complexTypeRegex = /<xs:complexType\s+name="(\w+)"[^>]*>([\s\S]*?)<\/xs:complexType>/g;
    let match: RegExpExecArray | null;
    
    while ((match = complexTypeRegex.exec(content)) !== null) {
      const typeName = match[1];
      const typeBody = match[2];
      
      if (typeName && typeBody) {
        const fields = this.parseComplexTypeFields(typeBody);
        
        models[typeName] = {
          name: typeName,
          fields,
          modelLevelUniques: []
        };
      }
    }
    
    return models;
  }

  private parseComplexType(element: any, _schema: any): SchemaField[] {
    const fields: SchemaField[] = [];
    
    if (element['xs:complexType'] && element['xs:complexType']['xs:sequence']) {
      const sequence = element['xs:complexType']['xs:sequence'];
      if (sequence['xs:element']) {
        const elements = Array.isArray(sequence['xs:element']) ? sequence['xs:element'] : [sequence['xs:element']];
        
        for (const fieldElement of elements) {
          const field = this.parseElement(fieldElement);
          if (field) {
            fields.push(field);
          }
        }
      }
    }
    
    return fields;
  }

  private parseComplexTypeFields(typeBody: string): SchemaField[] {
    const fields: SchemaField[] = [];
    
    // Parse sequence elements
    const sequenceRegex = /<xs:sequence[^>]*>([\s\S]*?)<\/xs:sequence>/g;
    let sequenceMatch: RegExpExecArray | null;
    
    while ((sequenceMatch = sequenceRegex.exec(typeBody)) !== null) {
      const sequenceContent = sequenceMatch[1];
      
      // Parse individual elements
      const elementRegex = /<xs:element\s+name="(\w+)"[^>]*type="([^"]*)"[^>]*\/?>/g;
      let elementMatch: RegExpExecArray | null;
      
      while ((elementMatch = elementRegex.exec(sequenceContent || '')) !== null) {
        const fieldName = elementMatch[1];
        const fieldType = elementMatch[2];
        
        if (fieldName && fieldType) {
          const field = this.createFieldFromXML(fieldName, fieldType);
          if (field) {
            fields.push(field);
          }
        }
      }
    }
    
    return fields;
  }

  private parseElement(element: any): SchemaField | null {
    if (!element.name || !element.type) return null;
    
    return this.createFieldFromXML(element.name, element.type);
  }

  private createFieldFromXML(fieldName: string, fieldType: string): SchemaField | null {
    if (!fieldName || !fieldType) return null;
    
    // Parse array types
    const isArray = fieldType.includes('Array') || fieldType.includes('[]');
    let baseType = fieldType.replace(/Array|\[\]/g, '').trim();
    
    // Map XML Schema types to our schema types
    const mappedType = this.mapXMLSchemaType(baseType);
    const scalarTypes = new Set(['string', 'int', 'long', 'float', 'double', 'boolean', 'date', 'dateTime', 'time']);
    const isScalar = scalarTypes.has(baseType);
    const isRelation = !isScalar;
    
    return {
      name: fieldName,
      type: mappedType,
      rawType: fieldType,
      isArray,
      isOptional: false, // XML Schema elements are required by default
      isScalar,
      isRelation,
      isId: fieldName === 'id' || fieldName === '_id',
      isUnique: false,
      hasDefault: false,
      description: undefined
    };
  }

  private mapXMLSchemaType(xmlType: string): string {
    const typeMap: Record<string, string> = {
      'string': 'String',
      'int': 'Int',
      'long': 'BigInt',
      'float': 'Float',
      'double': 'Float',
      'boolean': 'Boolean',
      'date': 'Date',
      'dateTime': 'DateTime',
      'time': 'Time',
      'decimal': 'Decimal',
      'integer': 'Int',
      'positiveInteger': 'Int',
      'negativeInteger': 'Int',
      'nonPositiveInteger': 'Int',
      'nonNegativeInteger': 'Int'
    };
    
    return typeMap[xmlType] || xmlType;
  }
}
