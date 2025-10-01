import * as fs from 'fs';
import * as ts from 'typescript';
import { SchemaParser, SchemaField, SchemaModelsMap, SchemaValidation } from './baseSchemaParser';

export class TypeScriptParser implements SchemaParser {
  getSchemaType(): string {
    return 'typescript';
  }

  getSupportedExtensions(): string[] {
    return ['.ts', '.tsx'];
  }

  canParse(filePath: string): boolean {
    return filePath.endsWith('.ts') || filePath.endsWith('.tsx');
  }

  parseSchema(schemaPath: string): SchemaModelsMap {
    const content = fs.readFileSync(schemaPath, 'utf-8');
    return this.parseTypeScriptSchema(content);
  }

  validateSchema(schemaPath: string): SchemaValidation {
    try {
      const content = fs.readFileSync(schemaPath, 'utf8');
      
      // Basic validation checks
      const hasInterfaces = /interface\s+\w+\s*\{/.test(content) || /type\s+\w+\s*=/.test(content);
      const hasValidSyntax = this.isValidTypeScriptSyntax(content);
      
      const errors: string[] = [];
      if (!hasInterfaces) errors.push('No interface or type definitions found');
      if (!hasValidSyntax) errors.push('Invalid TypeScript syntax');
      
      return {
        valid: errors.length === 0,
        errors,
        path: schemaPath,
        schemaType: 'typescript'
      };
    } catch (err: any) {
      return {
        valid: false,
        errors: [`Cannot read TypeScript file: ${err.message}`],
        path: schemaPath,
        schemaType: 'typescript'
      };
    }
  }

  private parseTypeScriptSchema(content: string): SchemaModelsMap {
    const models: SchemaModelsMap = {};
    
    // Create TypeScript source file
    const sourceFile = ts.createSourceFile(
      'temp.ts',
      content,
      ts.ScriptTarget.Latest,
      true
    );

    // Visit all nodes in the AST
    const visit = (node: ts.Node) => {
      if (ts.isInterfaceDeclaration(node)) {
        this.parseInterface(node, models);
      } else if (ts.isTypeAliasDeclaration(node)) {
        this.parseTypeAlias(node, models);
      }
      
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return models;
  }

  private parseInterface(node: ts.InterfaceDeclaration, models: SchemaModelsMap): void {
    const interfaceName = node.name.text;
    const fields: SchemaField[] = [];

    node.members.forEach(member => {
      if (ts.isPropertySignature(member) && member.name && ts.isIdentifier(member.name)) {
        const field = this.parsePropertySignature(member);
        if (field) {
          fields.push(field);
        }
      }
    });

    models[interfaceName] = {
      name: interfaceName,
      fields,
      modelLevelUniques: []
    };
  }

  private parseTypeAlias(node: ts.TypeAliasDeclaration, models: SchemaModelsMap): void {
    const typeName = node.name.text;
    
    // Only parse object type aliases
    if (node.type && ts.isTypeLiteralNode(node.type)) {
      const fields: SchemaField[] = [];

      node.type.members.forEach(member => {
        if (ts.isPropertySignature(member) && member.name && ts.isIdentifier(member.name)) {
          const field = this.parsePropertySignature(member);
          if (field) {
            fields.push(field);
          }
        }
      });

      models[typeName] = {
        name: typeName,
        fields,
        modelLevelUniques: []
      };
    }
  }

  private parsePropertySignature(member: ts.PropertySignature): SchemaField | null {
    if (!member.name || !ts.isIdentifier(member.name)) return null;
    
    const fieldName = member.name.text;
    const fieldType = this.getTypeString(member.type);
    const isOptional = !!member.questionToken;
    
    // Parse array types
    const isArray = fieldType.includes('[]') || fieldType.includes('Array<');
    let baseType = fieldType.replace(/\[\]|Array<|>/g, '').trim();
    
    // Map TypeScript types to our schema types
    const scalarTypes = new Set(['string', 'number', 'boolean', 'Date', 'any', 'unknown']);
    const isScalar = scalarTypes.has(baseType) || this.isPrimitiveType(baseType);
    const isRelation = !isScalar;

    return {
      name: fieldName,
      type: this.mapTypeScriptType(baseType),
      rawType: fieldType,
      isArray,
      isOptional,
      isScalar,
      isRelation,
      isId: fieldName === 'id' || fieldName === '_id',
      isUnique: false,
      hasDefault: false,
      description: this.extractJSDocComment(member)
    };
  }

  private getTypeString(typeNode: ts.TypeNode | undefined): string {
    if (!typeNode) return 'any';
    
    // Handle different type node types
    if (ts.isTypeReferenceNode(typeNode)) {
      const typeName = ts.isIdentifier(typeNode.typeName) ? typeNode.typeName.text : '';
      if (typeNode.typeArguments && typeNode.typeArguments.length > 0) {
        const args = typeNode.typeArguments.map(arg => this.getTypeString(arg)).join(', ');
        return `${typeName}<${args}>`;
      }
      return typeName;
    } else if (ts.isArrayTypeNode(typeNode)) {
      return `${this.getTypeString(typeNode.elementType)}[]`;
    } else if (ts.isUnionTypeNode(typeNode)) {
      return typeNode.types.map(t => this.getTypeString(t)).join(' | ');
    } else if (ts.isLiteralTypeNode(typeNode)) {
      if (ts.isLiteralExpression(typeNode.literal)) {
        return this.getLiteralValue(typeNode.literal);
      }
      return 'unknown';
    } else if (ts.isToken(typeNode) && (typeNode.kind >= ts.SyntaxKind.StringKeyword && typeNode.kind <= ts.SyntaxKind.UnknownKeyword)) {
      return typeNode.kind === ts.SyntaxKind.StringKeyword ? 'string' :
             typeNode.kind === ts.SyntaxKind.NumberKeyword ? 'number' :
             typeNode.kind === ts.SyntaxKind.BooleanKeyword ? 'boolean' :
             typeNode.kind === ts.SyntaxKind.VoidKeyword ? 'void' :
             typeNode.kind === ts.SyntaxKind.UndefinedKeyword ? 'undefined' :
             typeNode.kind === ts.SyntaxKind.NullKeyword ? 'null' :
             typeNode.kind === ts.SyntaxKind.AnyKeyword ? 'any' :
             typeNode.kind === ts.SyntaxKind.UnknownKeyword ? 'unknown' :
             'any';
    }
    
    return 'any';
  }

  private getLiteralValue(literal: ts.LiteralExpression): string {
    if (ts.isStringLiteral(literal)) return `"${literal.text}"`;
    if (ts.isNumericLiteral(literal)) return literal.text;
    if (literal.kind === ts.SyntaxKind.TrueKeyword) return 'true';
    if (literal.kind === ts.SyntaxKind.FalseKeyword) return 'false';
    if (literal.kind === ts.SyntaxKind.NullKeyword) return 'null';
    return 'unknown';
  }

  private isPrimitiveType(type: string): boolean {
    const primitives = ['string', 'number', 'boolean', 'Date', 'any', 'unknown', 'void', 'null', 'undefined'];
    return primitives.includes(type);
  }

  private mapTypeScriptType(tsType: string): string {
    const typeMap: Record<string, string> = {
      'string': 'String',
      'number': 'Float',
      'boolean': 'Boolean',
      'Date': 'DateTime',
      'any': 'Any',
      'unknown': 'Any',
      'void': 'Void',
      'null': 'Null',
      'undefined': 'Undefined'
    };
    
    return typeMap[tsType] || tsType;
  }

  private extractJSDocComment(member: ts.PropertySignature): string | undefined {
    const sourceFile = member.getSourceFile();
    const fullText = sourceFile.getFullText();
    const start = member.getFullStart();
    const end = member.getStart();
    
    const beforeMember = fullText.substring(start, end);
    const jsdocMatch = beforeMember.match(/\/\*\*[\s\S]*?\*\//);
    
    if (jsdocMatch) {
      return jsdocMatch[0]
        .replace(/\/\*\*|\*\//g, '')
        .replace(/\s*\*\s*/g, ' ')
        .trim();
    }
    
    return undefined;
  }

  private isValidTypeScriptSyntax(content: string): boolean {
    try {
      const sourceFile = ts.createSourceFile(
        'temp.ts',
        content,
        ts.ScriptTarget.Latest,
        true
      );
      
      // Simple validation - check if we can parse the AST
      let hasValidNodes = false;
      const visit = (node: ts.Node) => {
        if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
          hasValidNodes = true;
        }
        ts.forEachChild(node, visit);
      };
      
      visit(sourceFile);
      return hasValidNodes;
    } catch {
      return false;
    }
  }
}
