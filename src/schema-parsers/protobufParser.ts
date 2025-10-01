import * as fs from 'fs';
import { SchemaParser, SchemaField, SchemaModelsMap, SchemaValidation } from './baseSchemaParser';

export class ProtobufParser implements SchemaParser {
  getSchemaType(): string {
    return 'protobuf';
  }

  getSupportedExtensions(): string[] {
    return ['.proto'];
  }

  canParse(filePath: string): boolean {
    return filePath.endsWith('.proto');
  }

  parseSchema(schemaPath: string): SchemaModelsMap {
    const content = fs.readFileSync(schemaPath, 'utf-8');
    return this.parseProtobufSchema(content);
  }

  validateSchema(schemaPath: string): SchemaValidation {
    try {
      const content = fs.readFileSync(schemaPath, 'utf8');
      
      // Basic validation checks
      const hasMessages = /message\s+\w+\s*\{/.test(content);
      const hasValidSyntax = this.isValidProtobufSyntax(content);
      
      const errors: string[] = [];
      if (!hasMessages) errors.push('No message definitions found');
      if (!hasValidSyntax) errors.push('Invalid Protocol Buffers syntax');
      
      return {
        valid: errors.length === 0,
        errors,
        path: schemaPath,
        schemaType: 'protobuf'
      };
    } catch (err: any) {
      return {
        valid: false,
        errors: [`Cannot read Protocol Buffers file: ${err.message}`],
        path: schemaPath,
        schemaType: 'protobuf'
      };
    }
  }

  private parseProtobufSchema(content: string): SchemaModelsMap {
    const models: SchemaModelsMap = {};
    
    // Parse using regex since protobufjs requires a full project setup
    const messageRegex = /message\s+(\w+)\s*\{([\s\S]*?)\}/g;
    let match: RegExpExecArray | null;
    
    while ((match = messageRegex.exec(content)) !== null) {
      const messageName = match[1];
      const messageBody = match[2];
      
      if (messageName && messageBody) {
        const fields = this.parseProtobufFields(messageBody);
        
        models[messageName] = {
          name: messageName,
          fields,
          modelLevelUniques: []
        };
      }
    }
    
    return models;
  }

  private parseProtobufFields(body: string): SchemaField[] {
    const fields: SchemaField[] = [];
    const lines = body.split('\n').map(l => l.trim()).filter(l => !!l && !l.startsWith('//'));
    
    for (const line of lines) {
      // Skip comments and closing braces
      if (line.startsWith('//') || line.startsWith('}')) continue;
      
      // Parse field definition: [repeated] type fieldName = fieldNumber;
      const fieldMatch = line.match(/^(repeated\s+)?(\w+)\s+(\w+)\s*=\s*(\d+);?/);
      if (!fieldMatch) continue;
      
      const isRepeated = !!fieldMatch[1];
      const fieldType = fieldMatch[2];
      const fieldName = fieldMatch[3];
      const fieldNumber = fieldMatch[4];
      
      if (!fieldName || !fieldType || !fieldNumber) continue;
      
      // Map protobuf types to our schema types
      const mappedType = this.mapProtobufType(fieldType);
      const scalarTypes = new Set(['string', 'int32', 'int64', 'uint32', 'uint64', 'sint32', 'sint64', 'fixed32', 'fixed64', 'sfixed32', 'sfixed64', 'bool', 'double', 'float', 'bytes']);
      const isScalar = scalarTypes.has(fieldType);
      const isRelation = !isScalar;
      
      fields.push({
        name: fieldName,
        type: mappedType,
        rawType: fieldType,
        isArray: isRepeated,
        isOptional: false, // Protobuf fields are always optional by default
        isScalar,
        isRelation,
        isId: fieldName === 'id' || fieldName === '_id',
        isUnique: false,
        hasDefault: false,
        description: this.extractComment(line),
        constraints: {
          fieldNumber: parseInt(fieldNumber, 10)
        }
      });
    }
    
    return fields;
  }

  private mapProtobufType(protobufType: string): string {
    const typeMap: Record<string, string> = {
      'string': 'String',
      'int32': 'Int',
      'int64': 'BigInt',
      'uint32': 'Int',
      'uint64': 'BigInt',
      'sint32': 'Int',
      'sint64': 'BigInt',
      'fixed32': 'Int',
      'fixed64': 'BigInt',
      'sfixed32': 'Int',
      'sfixed64': 'BigInt',
      'bool': 'Boolean',
      'double': 'Float',
      'float': 'Float',
      'bytes': 'Bytes'
    };
    
    return typeMap[protobufType] || protobufType;
  }

  private extractComment(line: string): string | undefined {
    const commentMatch = line.match(/\/\/\s*(.+)/);
    return commentMatch ? commentMatch[1]?.trim() : undefined;
  }

  private isValidProtobufSyntax(content: string): boolean {
    // Basic syntax validation
    const openBraces = (content.match(/\{/g) || []).length;
    const closeBraces = (content.match(/\}/g) || []).length;
    
    return openBraces === closeBraces;
  }
}
