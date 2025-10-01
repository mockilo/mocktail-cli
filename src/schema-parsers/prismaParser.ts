import * as fs from 'fs';
import type { LegacyModelsMap } from '../types';
import { SchemaParser, SchemaField, SchemaModelsMap, SchemaValidation } from './baseSchemaParser';

interface ParsedAttributes {
  relationFields?: string[];
  relationReferences?: string[];
  relationName?: string | undefined;
  isId: boolean;
  isUnique: boolean;
  hasDefault: boolean;
}

function parseAttributes(attrStr: string): ParsedAttributes {
  const attrs: ParsedAttributes = {
    isId: false,
    isUnique: false,
    hasDefault: false
  };
  
  const relationMatch = attrStr.match(/@relation\(([^)]*)\)/);
  if (relationMatch) {
    const inner = relationMatch[1];
    const fieldsMatch = inner?.match(/fields\s*:\s*\[([^\]]+)\]/);
    const refMatch = inner?.match(/references\s*:\s*\[([^\]]+)\]/);
    const nameMatch = inner?.match(/name\s*:\s*"(.*?)"|name\s*:\s*'(.*?)'/);
    if (fieldsMatch) {
      attrs.relationFields = fieldsMatch[1]?.split(',').map(s => s.trim()) || [];
    }
    if (refMatch) {
      attrs.relationReferences = refMatch[1]?.split(',').map(s => s.trim()) || [];
    }
    if (nameMatch) {
      attrs.relationName = (nameMatch[1] || nameMatch[2] || undefined);
    }
  }
  attrs.isId = /@id\b/.test(attrStr);
  attrs.isUnique = /@unique\b/.test(attrStr);
  attrs.hasDefault = /@default\(/.test(attrStr);
  return attrs;
}

export class PrismaSchemaParser implements SchemaParser {
  getSchemaType(): string {
    return 'prisma';
  }

  getSupportedExtensions(): string[] {
    return ['.prisma'];
  }

  canParse(filePath: string): boolean {
    return filePath.endsWith('.prisma');
  }

  parseSchema(schemaPath: string): SchemaModelsMap {
    return this.parsePrismaSchema(schemaPath);
  }

  validateSchema(schemaPath: string): SchemaValidation {
    return this.validatePrismaSchema(schemaPath);
  }

  private parsePrismaSchema(schemaPath: string): SchemaModelsMap {
    const raw = fs.readFileSync(schemaPath, 'utf-8');

    // Matches model blocks (non-greedy)
    const modelRegex = /model\s+(\w+)\s*\{([\s\S]*?)\}/g;

    const scalarTypes = new Set(['String','Int','Float','Boolean','DateTime','Json','BigInt','Decimal']);
    const models: SchemaModelsMap = {};
    let m: RegExpExecArray | null;
  
  while ((m = modelRegex.exec(raw)) !== null) {
    const modelName = m[1];
    const body = m[2];

    const lines = body?.split('\n').map(l => l.trim()).filter(l => !!l && !l.startsWith('//') && !l.startsWith('/*')) || [];

    // First, capture model-level unique constraints like @@unique([userId]) or @@unique([a, b])
    const modelLevelUniques: string[][] = [];
    for (const line of lines) {
      if (line.startsWith('@@unique')) {
        const arrMatch = line.match(/@@unique\s*\(\s*\[([^\]]+)\]/);
        if (arrMatch) {
          const fields = arrMatch[1]?.split(',').map(s => s.trim()) || [];
          modelLevelUniques.push(fields);
        }
      }
    }

    const fields: SchemaField[] = [];
    for (const line of lines) {
      // skip full-line attributes or block endings
      if (line.startsWith('@') || line.startsWith('@@')) continue;

      // Field lines look like: name Type? @attr(...)
      const fieldMatch = line.match(/^(\w+)\s+([A-Za-z0-9\[\]]+)(\?)?\s*(.*)$/);
      if (!fieldMatch) continue;

      const name = fieldMatch[1];
      const rawType = fieldMatch[2];
      const optionalMark = fieldMatch[3];
      const rest = fieldMatch[4] || '';

      const isArray = /\[\]$/.test(rawType || '');
      const type = (rawType || '').replace(/\[\]$/, '');
      const isOptional = !!optionalMark || /\?$/.test(rawType || '');

      const attrs = parseAttributes(rest);
      const isScalar = scalarTypes.has(type);
      const isRelation = !isScalar;

      const field: SchemaField = {
        name: name || '',
        type,
        rawType: rawType || '',
        isArray,
        isOptional,
        isScalar,
        isRelation,
        isId: !!attrs.isId,
        isUnique: !!attrs.isUnique,
        hasDefault: !!attrs.hasDefault,
      };

      if (attrs.relationFields) field.relationFromFields = attrs.relationFields.map(s => s.trim());
      if (attrs.relationReferences) field.relationReferences = attrs.relationReferences.map(s => s.trim());
      if (attrs.relationName) field.relationName = attrs.relationName;

      fields.push(field);
    }

    // Mark single-field model-level uniques onto the corresponding field entries
    for (const uniqueGroup of modelLevelUniques) {
      if (uniqueGroup.length === 1) {
        const fName = uniqueGroup[0];
        const field = fields.find(f => f.name === fName);
        if (field) field.isUnique = true;
      }
    }

    models[modelName || ''] = {
      name: modelName || '',
      fields,
      modelLevelUniques,
    };
  }

    return models;
  }

  private validatePrismaSchema(schemaPath: string): SchemaValidation {
    try {
      const content = fs.readFileSync(schemaPath, 'utf8');
      
      // Basic validation checks
      const hasDataSource = /datasource\s+db\s*\{/.test(content);
      const hasGenerator = /generator\s+client\s*\{/.test(content);
      const hasModels = /model\s+\w+\s*\{/.test(content);
      
      const errors: string[] = [];
      if (!hasDataSource) errors.push('Missing datasource block');
      if (!hasGenerator) errors.push('Missing generator block');
      if (!hasModels) errors.push('No models found');
      
      return {
        valid: errors.length === 0,
        errors,
        path: schemaPath,
        schemaType: 'prisma'
      };
    } catch (err: any) {
      return {
        valid: false,
        errors: [`Cannot read schema file: ${err.message}`],
        path: schemaPath,
        schemaType: 'prisma'
      };
    }
  }
}

// Export the function for backward compatibility
export function parsePrismaSchema(schemaPath: string): LegacyModelsMap {
  const parser = new PrismaSchemaParser();
  return parser.parseSchema(schemaPath) as LegacyModelsMap;
}
