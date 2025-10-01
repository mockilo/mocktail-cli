import * as fs from 'fs';
import { SchemaParser, SchemaField, SchemaModelsMap, SchemaValidation } from './baseSchemaParser';

export class SQLDdlParser implements SchemaParser {
  getSchemaType(): string {
    return 'sql-ddl';
  }

  getSupportedExtensions(): string[] {
    return ['.sql'];
  }

  canParse(filePath: string): boolean {
    return filePath.endsWith('.sql');
  }

  parseSchema(schemaPath: string): SchemaModelsMap {
    const content = fs.readFileSync(schemaPath, 'utf-8');
    return this.parseSQLSchema(content);
  }

  validateSchema(schemaPath: string): SchemaValidation {
    try {
      const content = fs.readFileSync(schemaPath, 'utf8');
      
      // Basic validation checks
      const hasCreateTable = /CREATE\s+TABLE/i.test(content);
      const hasValidSyntax = this.isValidSQLSyntax(content);
      
      const errors: string[] = [];
      if (!hasCreateTable) errors.push('No CREATE TABLE statements found');
      if (!hasValidSyntax) errors.push('Invalid SQL syntax');
      
      return {
        valid: errors.length === 0,
        errors,
        path: schemaPath,
        schemaType: 'sql-ddl'
      };
    } catch (err: any) {
      return {
        valid: false,
        errors: [`Cannot read SQL file: ${err.message}`],
        path: schemaPath,
        schemaType: 'sql-ddl'
      };
    }
  }

  private parseSQLSchema(content: string): SchemaModelsMap {
    const models: SchemaModelsMap = {};
    
    // Parse CREATE TABLE statements
    const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:`?(\w+)`?\.)?`?(\w+)`?\s*\(([\s\S]*?)\)/gi;
    let match: RegExpExecArray | null;
    
    while ((match = createTableRegex.exec(content)) !== null) {
      const schemaName = match[1];
      const tableName = match[2];
      const tableBody = match[3];
      
      if (tableName && tableBody) {
        const fullTableName = schemaName ? `${schemaName}.${tableName}` : tableName;
        const fields = this.parseTableFields(tableBody);
        
        models[fullTableName] = {
          name: fullTableName,
          fields,
          modelLevelUniques: []
        };
      }
    }
    
    return models;
  }

  private parseTableFields(tableBody: string): SchemaField[] {
    const fields: SchemaField[] = [];
    const lines = tableBody.split('\n').map(l => l.trim()).filter(l => !!l);
    
    for (const line of lines) {
      // Skip comments and constraints
      if (line.startsWith('--') || line.startsWith('/*') || line.startsWith('CONSTRAINT') || line.startsWith('PRIMARY KEY') || line.startsWith('FOREIGN KEY') || line.startsWith('UNIQUE') || line.startsWith('INDEX')) {
        continue;
      }
      
      // Parse column definition: column_name data_type [constraints]
      const columnMatch = line.match(/^`?(\w+)`?\s+(\w+(?:\([^)]*\))?)\s*(.*?)(?:,|$)/);
      if (!columnMatch) continue;
      
      const columnName = columnMatch[1];
      const dataType = columnMatch[2];
      const constraints = columnMatch[3] || '';
      
      if (!columnName || !dataType) continue;
      
      // Parse constraints
      const isPrimaryKey = /PRIMARY\s+KEY/i.test(constraints);
      const isUnique = /UNIQUE/i.test(constraints);
      const isNotNull = /NOT\s+NULL/i.test(constraints);
      const isAutoIncrement = /AUTO_INCREMENT|AUTOINCREMENT|SERIAL/i.test(constraints);
      
      // Parse array types
      const isArray = dataType.includes('[]') || dataType.includes('ARRAY');
      let baseType = dataType.replace(/\[\]|ARRAY/gi, '').trim();
      
      // Map SQL types to our schema types
      const mappedType = this.mapSQLType(baseType);
      const scalarTypes = new Set(['VARCHAR', 'CHAR', 'TEXT', 'INT', 'INTEGER', 'BIGINT', 'SMALLINT', 'TINYINT', 'FLOAT', 'DOUBLE', 'DECIMAL', 'NUMERIC', 'BOOLEAN', 'BOOL', 'DATE', 'DATETIME', 'TIMESTAMP', 'TIME', 'BLOB', 'BINARY', 'VARBINARY']);
      const isScalar = scalarTypes.has(baseType.toUpperCase());
      const isRelation = !isScalar;
      
      fields.push({
        name: columnName,
        type: mappedType,
        rawType: dataType,
        isArray,
        isOptional: !isNotNull,
        isScalar,
        isRelation,
        isId: isPrimaryKey || columnName === 'id' || columnName === '_id',
        isUnique: isUnique || isPrimaryKey,
        hasDefault: /DEFAULT/i.test(constraints),
        description: this.extractComment(constraints),
        constraints: {
          primaryKey: isPrimaryKey,
          autoIncrement: isAutoIncrement,
          notNull: isNotNull,
          unique: isUnique,
          rawConstraints: constraints.trim()
        }
      });
    }
    
    return fields;
  }

  private mapSQLType(sqlType: string): string {
    const upperType = sqlType.toUpperCase();
    
    const typeMap: Record<string, string> = {
      'VARCHAR': 'String',
      'CHAR': 'String',
      'TEXT': 'String',
      'LONGTEXT': 'String',
      'MEDIUMTEXT': 'String',
      'TINYTEXT': 'String',
      'INT': 'Int',
      'INTEGER': 'Int',
      'BIGINT': 'BigInt',
      'SMALLINT': 'Int',
      'TINYINT': 'Int',
      'FLOAT': 'Float',
      'DOUBLE': 'Float',
      'DECIMAL': 'Decimal',
      'NUMERIC': 'Decimal',
      'BOOLEAN': 'Boolean',
      'BOOL': 'Boolean',
      'DATE': 'Date',
      'DATETIME': 'DateTime',
      'TIMESTAMP': 'DateTime',
      'TIME': 'Time',
      'BLOB': 'Bytes',
      'BINARY': 'Bytes',
      'VARBINARY': 'Bytes',
      'LONGBLOB': 'Bytes',
      'MEDIUMBLOB': 'Bytes',
      'TINYBLOB': 'Bytes',
      'JSON': 'Json',
      'UUID': 'String'
    };
    
    // Handle parameterized types like VARCHAR(255)
    const baseType = upperType.replace(/\([^)]*\)/, '');
    return typeMap[baseType] || baseType;
  }

  private extractComment(constraints: string): string | undefined {
    const commentMatch = constraints.match(/COMMENT\s+['"`]([^'"`]*)['"`]/i);
    return commentMatch ? commentMatch[1] : undefined;
  }

  private isValidSQLSyntax(content: string): boolean {
    // Basic SQL syntax validation
    const openParens = (content.match(/\(/g) || []).length;
    const closeParens = (content.match(/\)/g) || []).length;
    
    return openParens === closeParens;
  }
}
