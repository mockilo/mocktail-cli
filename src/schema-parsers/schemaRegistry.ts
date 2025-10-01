// Schema registry for managing different schema parsers

import { SchemaParser, SchemaModelsMap, SchemaValidation } from './baseSchemaParser';
import { PrismaSchemaParser } from './prismaParser';
import { GraphQLSchemaParser } from './graphqlParser';
import { JsonSchemaParser } from './jsonSchemaParser';
import { OpenAPISchemaParser } from './openapiParser';
import { TypeScriptParser } from './typescriptParser';
import { ProtobufParser } from './protobufParser';
import { AvroParser } from './avroParser';
import { XMLSchemaParser } from './xmlSchemaParser';
import { SQLDdlParser } from './sqlDdlParser';
import { MongooseParser } from './mongooseParser';
import { SequelizeParser } from './sequelizeParser';
import { JoiParser } from './joiParser';
import { YupParser } from './yupParser';
import { ZodParser } from './zodParser';

export class SchemaRegistry {
  private parsers: Map<string, SchemaParser> = new Map();
  private detector: SchemaDetector;

  constructor() {
    this.detector = new SchemaDetector();
    this.registerDefaultParsers();
  }

  private registerDefaultParsers(): void {
    // Register Prisma parser
    const prismaParser = new PrismaSchemaParser();
    this.registerParser('prisma', prismaParser);

    // Register GraphQL parser
    const graphqlParser = new GraphQLSchemaParser();
    this.registerParser('graphql', graphqlParser);

    // Register JSON Schema parser
    const jsonParser = new JsonSchemaParser();
    this.registerParser('json-schema', jsonParser);

    // Register OpenAPI parser
    const openapiParser = new OpenAPISchemaParser();
    this.registerParser('openapi', openapiParser);

    // Register TypeScript parser
    const typescriptParser = new TypeScriptParser();
    this.registerParser('typescript', typescriptParser);

    // Register Protocol Buffers parser
    const protobufParser = new ProtobufParser();
    this.registerParser('protobuf', protobufParser);

    // Register Avro parser
    const avroParser = new AvroParser();
    this.registerParser('avro', avroParser);

    // Register XML Schema parser
    const xmlSchemaParser = new XMLSchemaParser();
    this.registerParser('xml-schema', xmlSchemaParser);

    // Register SQL DDL parser
    const sqlDdlParser = new SQLDdlParser();
    this.registerParser('sql-ddl', sqlDdlParser);

    // Register Mongoose parser
    const mongooseParser = new MongooseParser();
    this.registerParser('mongoose', mongooseParser);

    // Register Sequelize parser
    const sequelizeParser = new SequelizeParser();
    this.registerParser('sequelize', sequelizeParser);

    // Register Joi parser
    const joiParser = new JoiParser();
    this.registerParser('joi', joiParser);

    // Register Yup parser
    const yupParser = new YupParser();
    this.registerParser('yup', yupParser);

    // Register Zod parser
    const zodParser = new ZodParser();
    this.registerParser('zod', zodParser);
  }

  registerParser(schemaType: string, parser: SchemaParser): void {
    this.parsers.set(schemaType, parser);
  }

  getParser(schemaType: string): SchemaParser | undefined {
    return this.parsers.get(schemaType);
  }

  getDetector(): SchemaDetector {
    return this.detector;
  }

  getSupportedSchemaTypes(): string[] {
    return Array.from(this.parsers.keys());
  }

  async parseSchema(schemaPath: string, schemaType?: string): Promise<SchemaModelsMap> {
    const detectedType = schemaType || this.detector.detectSchemaType(schemaPath);
    
    if (!detectedType) {
      throw new Error(`Unable to detect schema type for: ${schemaPath}`);
    }

    const parser = this.getParser(detectedType);
    if (!parser) {
      throw new Error(`No parser available for schema type: ${detectedType}`);
    }

    return parser.parseSchema(schemaPath);
  }

  async validateSchema(schemaPath: string, schemaType?: string): Promise<SchemaValidation> {
    const detectedType = schemaType || this.detector.detectSchemaType(schemaPath);
    
    if (!detectedType) {
      return {
        valid: false,
        errors: ['Unable to detect schema type'],
        path: schemaPath
      };
    }

    const parser = this.getParser(detectedType);
    if (!parser) {
      return {
        valid: false,
        errors: [`No parser available for schema type: ${detectedType}`],
        path: schemaPath,
        schemaType: detectedType
      };
    }

    return parser.validateSchema(schemaPath);
  }
}

export class SchemaDetector {
  private schemaTypePatterns: Map<string, RegExp[]> = new Map();

  constructor() {
    this.initializePatterns();
  }

  private initializePatterns(): void {
    // Prisma patterns
    this.schemaTypePatterns.set('prisma', [
      /model\s+\w+\s*\{/,
      /datasource\s+db\s*\{/,
      /generator\s+client\s*\{/
    ]);

    // GraphQL patterns
    this.schemaTypePatterns.set('graphql', [
      /type\s+\w+\s*\{/,
      /interface\s+\w+\s*\{/,
      /input\s+\w+\s*\{/,
      /enum\s+\w+\s*\{/,
      /extend\s+type\s+\w+/
    ]);

    // JSON Schema patterns
    this.schemaTypePatterns.set('json-schema', [
      /"\$schema"\s*:\s*"https?:\/\/json-schema\.org/,
      /"type"\s*:\s*"object"/,
      /"properties"\s*:\s*\{/
    ]);

    // OpenAPI patterns
    this.schemaTypePatterns.set('openapi', [
      /"openapi"\s*:\s*"3\.\d+\.\d+"/,
      /"swagger"\s*:\s*"2\.\d+\.\d+"/,
      /"paths"\s*:\s*\{/,
      /"components"\s*:\s*\{/
    ]);

    // TypeScript patterns
    this.schemaTypePatterns.set('typescript', [
      /interface\s+\w+\s*\{/,
      /type\s+\w+\s*=/,
      /export\s+interface/,
      /export\s+type/
    ]);

    // Protocol Buffers patterns
    this.schemaTypePatterns.set('protobuf', [
      /message\s+\w+\s*\{/,
      /syntax\s*=\s*"proto3"/,
      /syntax\s*=\s*"proto2"/,
      /package\s+\w+/
    ]);

    // Avro patterns
    this.schemaTypePatterns.set('avro', [
      /"type"\s*:\s*"record"/,
      /"namespace"\s*:/,
      /"fields"\s*:\s*\[/
    ]);

    // XML Schema patterns
    this.schemaTypePatterns.set('xml-schema', [
      /<xs:schema/,
      /<xs:element/,
      /<xs:complexType/,
      /xmlns:xs=/
    ]);

    // SQL DDL patterns
    this.schemaTypePatterns.set('sql-ddl', [
      /CREATE\s+TABLE/i,
      /CREATE\s+INDEX/i,
      /ALTER\s+TABLE/i,
      /DROP\s+TABLE/i
    ]);

    // Mongoose patterns
    this.schemaTypePatterns.set('mongoose', [
      /require\(['"]mongoose['"]\)/,
      /import.*mongoose/,
      /new\s+Schema\(/,
      /mongoose\.model\(/
    ]);

    // Sequelize patterns
    this.schemaTypePatterns.set('sequelize', [
      /require\(['"]sequelize['"]\)/,
      /import.*sequelize/,
      /\.define\(/,
      /DataTypes\./
    ]);

    // Joi patterns
    this.schemaTypePatterns.set('joi', [
      /require\(['"]joi['"]\)/,
      /import.*joi/,
      /Joi\.object\(/,
      /Joi\.string\(\)/
    ]);

    // Yup patterns
    this.schemaTypePatterns.set('yup', [
      /require\(['"]yup['"]\)/,
      /import.*yup/,
      /yup\.object\(/,
      /yup\.string\(\)/
    ]);

    // Zod patterns
    this.schemaTypePatterns.set('zod', [
      /require\(['"]zod['"]\)/,
      /import.*zod/,
      /z\.object\(/,
      /z\.string\(\)/
    ]);
  }

  detectSchemaType(filePath: string, content?: string): string | null {
    // First try to detect by file extension
    const extension = this.getFileExtension(filePath);
    const extensionMap: Record<string, string> = {
      '.prisma': 'prisma',
      '.graphql': 'graphql',
      '.gql': 'graphql',
      '.json': 'json-schema', // Could be JSON Schema or OpenAPI
      '.yaml': 'openapi',
      '.yml': 'openapi',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.proto': 'protobuf',
      '.avsc': 'avro',
      '.avro': 'avro',
      '.xsd': 'xml-schema',
      '.sql': 'sql-ddl',
      '.js': 'mongoose' // Could be Mongoose, Sequelize, Joi, Yup, or Zod
    };

    if (extension && extensionMap[extension]) {
      const detectedType = extensionMap[extension];
      
      // For JSON files, we need to check content to distinguish between JSON Schema and OpenAPI
      if (detectedType === 'json-schema' && content) {
        const openapiPatterns = this.schemaTypePatterns.get('openapi') || [];
        if (openapiPatterns.some(pattern => pattern.test(content))) {
          return 'openapi';
        }
      }
      
      return detectedType;
    }

    // If no extension match or content provided, analyze content
    if (content) {
      for (const [schemaType, patterns] of this.schemaTypePatterns) {
        if (patterns.some(pattern => pattern.test(content))) {
          return schemaType;
        }
      }
    }

    return null;
  }

  findSchemaFiles(basePath: string): string[] {
    const fs = require('fs');
    const path = require('path');
    const schemas: string[] = [];
    
    const extensions = ['.prisma', '.graphql', '.gql', '.json', '.yaml', '.yml', '.ts', '.tsx', '.proto', '.avsc', '.avro', '.xsd', '.sql', '.js'];
    
    function scanDirectory(dir: string): void {
      try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
            scanDirectory(fullPath);
          } else if (extensions.some(ext => file.endsWith(ext))) {
            schemas.push(fullPath);
          }
        }
      } catch (err) {
        // Skip directories we can't read
      }
    }
    
    scanDirectory(basePath);
    return schemas;
  }

  getSupportedSchemaTypes(): string[] {
    return Array.from(this.schemaTypePatterns.keys());
  }

  private getFileExtension(filePath: string): string {
    const lastDot = filePath.lastIndexOf('.');
    return lastDot !== -1 ? filePath.substring(lastDot) : '';
  }
}
