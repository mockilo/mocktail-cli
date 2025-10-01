import * as fs from 'fs';
import { SchemaParser, SchemaField, SchemaModelsMap, SchemaValidation } from './baseSchemaParser';

export class SequelizeParser implements SchemaParser {
  getSchemaType(): string {
    return 'sequelize';
  }

  getSupportedExtensions(): string[] {
    return ['.js', '.ts'];
  }

  canParse(filePath: string): boolean {
    return filePath.endsWith('.js') || filePath.endsWith('.ts');
  }

  parseSchema(schemaPath: string): SchemaModelsMap {
    const content = fs.readFileSync(schemaPath, 'utf-8');
    return this.parseSequelizeSchema(content);
  }

  validateSchema(schemaPath: string): SchemaValidation {
    try {
      const content = fs.readFileSync(schemaPath, 'utf8');
      
      // Basic validation checks
      const hasSequelize = /require\(['"]sequelize['"]\)|import.*sequelize|from\s+['"]sequelize['"]/.test(content);
      const hasDefine = /\.define\(|sequelize\.define\(/.test(content);
      const hasModel = /Model\.init\(/.test(content);
      
      const errors: string[] = [];
      if (!hasSequelize) errors.push('Not a Sequelize model file - missing sequelize import');
      if (!hasDefine && !hasModel) errors.push('No model definitions found');
      
      return {
        valid: errors.length === 0,
        errors,
        path: schemaPath,
        schemaType: 'sequelize'
      };
    } catch (err: any) {
      return {
        valid: false,
        errors: [`Cannot read Sequelize file: ${err.message}`],
        path: schemaPath,
        schemaType: 'sequelize'
      };
    }
  }

  private parseSequelizeSchema(content: string): SchemaModelsMap {
    const models: SchemaModelsMap = {};
    
    // Parse model definitions using define()
    const defineRegex = /(?:sequelize\.)?define\(['"`]([^'"`]+)['"`]\s*,\s*\{([\s\S]*?)\}/g;
    let match: RegExpExecArray | null;
    
    while ((match = defineRegex.exec(content)) !== null) {
      const modelName = match[1];
      const modelDef = match[2];
      
      if (modelName && modelDef) {
        const fields = this.parseModelFields(modelDef);
        
        models[modelName] = {
          name: modelName,
          fields,
          modelLevelUniques: []
        };
      }
    }
    
    // Parse model definitions using Model.init()
    const initRegex = /Model\.init\(([\s\S]*?),\s*\{[\s\S]*?modelName:\s*['"`]([^'"`]+)['"`]/g;
    while ((match = initRegex.exec(content)) !== null) {
      const modelDef = match[1];
      const modelName = match[2];
      
      if (modelName && modelDef) {
        const fields = this.parseModelFields(modelDef);
        
        models[modelName] = {
          name: modelName,
          fields,
          modelLevelUniques: []
        };
      }
    }
    
    return models;
  }

  private parseModelFields(modelDef: string): SchemaField[] {
    const fields: SchemaField[] = [];
    
    // Parse field definitions
    const fieldRegex = /(\w+):\s*\{([^}]*)\}/g;
    let match: RegExpExecArray | null;
    
    while ((match = fieldRegex.exec(modelDef)) !== null) {
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
    const typeMatch = fieldDef.match(/type:\s*DataTypes\.(\w+)/);
      const fieldType = typeMatch ? (typeMatch[1] || 'STRING') : 'STRING';
    
    // Parse array type
    const isArray = /DataTypes\.ARRAY/.test(fieldDef) || /type:\s*\[/.test(fieldDef);
    
    // Parse allowNull
    const allowNull = !/allowNull:\s*false/.test(fieldDef);
    
    // Parse primaryKey
    const isPrimaryKey = /primaryKey:\s*true/.test(fieldDef);
    
    // Parse unique
    const isUnique = /unique:\s*true/.test(fieldDef);
    
    // Parse defaultValue
    const hasDefault = /defaultValue:/.test(fieldDef);
    
    // Parse references (relation)
    const hasRef = /references:\s*\{/.test(fieldDef);
    const refMatch = fieldDef.match(/references:\s*\{\s*model:\s*['"`]([^'"`]+)['"`]/);
    const refType = refMatch ? refMatch[1] : null;
    
    // Map Sequelize types to our schema types
    const mappedType = this.mapSequelizeType(fieldType);
    const scalarTypes = new Set(['STRING', 'TEXT', 'INTEGER', 'BIGINT', 'FLOAT', 'DOUBLE', 'DECIMAL', 'BOOLEAN', 'DATE', 'DATEONLY', 'TIME', 'JSON', 'JSONB', 'BLOB', 'UUID']);
    const isScalar = scalarTypes.has(fieldType) || !hasRef;
    const isRelation = hasRef || (!isScalar && !scalarTypes.has(fieldType));
    
    return {
      name: fieldName,
      type: refType || mappedType,
      rawType: fieldType,
      isArray,
      isOptional: allowNull,
      isScalar,
      isRelation,
      isId: isPrimaryKey || fieldName === 'id' || fieldName === '_id',
      isUnique,
      hasDefault,
      description: this.extractComment(fieldDef),
      constraints: {
        references: refType,
        allowNull,
        primaryKey: isPrimaryKey,
        unique: isUnique,
        defaultValue: hasDefault
      }
    };
  }

  private mapSequelizeType(sequelizeType: string): string {
    const typeMap: Record<string, string> = {
      'STRING': 'String',
      'TEXT': 'String',
      'CHAR': 'String',
      'INTEGER': 'Int',
      'BIGINT': 'BigInt',
      'FLOAT': 'Float',
      'DOUBLE': 'Float',
      'DECIMAL': 'Decimal',
      'BOOLEAN': 'Boolean',
      'DATE': 'DateTime',
      'DATEONLY': 'Date',
      'TIME': 'Time',
      'JSON': 'Json',
      'JSONB': 'Json',
      'BLOB': 'Bytes',
      'UUID': 'String',
      'ARRAY': 'Array'
    };
    
    return typeMap[sequelizeType] || sequelizeType;
  }

  private extractComment(fieldDef: string): string | undefined {
    const commentMatch = fieldDef.match(/comment:\s*['"`]([^'"`]*)['"`]/);
    return commentMatch ? commentMatch[1] : undefined;
  }
}
