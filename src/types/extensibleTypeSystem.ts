import { faker } from '@faker-js/faker';
import { SchemaField } from '../schema-parsers/baseSchemaParser';

export interface TypeGenerator {
  name: string;
  patterns: (string | RegExp)[];
  generate: (field: SchemaField, context?: GenerationContext) => any;
  priority: number; // Higher priority = checked first
  description?: string;
}

export interface GenerationContext {
  modelName: string;
  recordIndex: number;
  relatedFields?: Record<string, any>;
  existingData?: Record<string, any[]>;
  schemaType?: string;
}

export interface FormatGenerator {
  format: string;
  baseType: string;
  generate: (field: SchemaField, context?: GenerationContext) => any;
  validate?: (value: any) => boolean;
}

export interface ScalarGenerator {
  scalarName: string;
  generate: (field: SchemaField, context?: GenerationContext) => any;
  validate?: (value: any) => boolean;
}

export class ExtensibleTypeSystem {
  private typeGenerators: Map<string, TypeGenerator> = new Map();
  private formatGenerators: Map<string, FormatGenerator> = new Map();
  private scalarGenerators: Map<string, ScalarGenerator> = new Map();
  private contextualGenerators: Map<string, TypeGenerator> = new Map();

  constructor() {
    this.registerDefaultGenerators();
    this.registerDefaultFormats();
    this.registerDefaultScalars();
    this.registerContextualGenerators();
  }

  // Register a custom type generator
  registerTypeGenerator(generator: TypeGenerator): void {
    this.typeGenerators.set(generator.name, generator);
  }

  // Register a format-based generator (JSON Schema, OpenAPI)
  registerFormatGenerator(generator: FormatGenerator): void {
    this.formatGenerators.set(generator.format, generator);
  }

  // Register a scalar generator (GraphQL, custom types)
  registerScalarGenerator(generator: ScalarGenerator): void {
    this.scalarGenerators.set(generator.scalarName, generator);
  }

  // Generate value for a field using the most appropriate generator
  generateValue(field: SchemaField, context?: GenerationContext): any {
    // 1. Check for custom scalars first (highest priority)
    if (this.scalarGenerators.has(field.type)) {
      const generator = this.scalarGenerators.get(field.type)!;
      return generator.generate(field, context);
    }

    // 2. Check for format-based generation (JSON Schema formats)
    if (field.format && this.formatGenerators.has(field.format)) {
      const generator = this.formatGenerators.get(field.format)!;
      return generator.generate(field, context);
    }

    // 3. Check contextual generators (field name + type combinations)
    const contextKey = `${field.name}:${field.type}`;
    if (this.contextualGenerators.has(contextKey)) {
      const generator = this.contextualGenerators.get(contextKey)!;
      return generator.generate(field, context);
    }

    // 4. Check field name patterns (smart field detection)
    for (const [_, generator] of this.typeGenerators) {
      for (const pattern of generator.patterns) {
        if (typeof pattern === 'string') {
          if (field.name.toLowerCase().includes(pattern.toLowerCase())) {
            return generator.generate(field, context);
          }
        } else if (pattern instanceof RegExp) {
          if (pattern.test(field.name) || pattern.test(field.type)) {
            return generator.generate(field, context);
          }
        }
      }
    }

    // 5. Fallback to basic type generation
    return this.generateBasicType(field, context);
  }

  private generateBasicType(field: SchemaField, _context?: GenerationContext): any {
    const baseType = field.type.replace(/\[\]$/, "").toLowerCase();
    
    switch (baseType) {
      case 'string':
      case 'text':
        return faker.lorem.words({ min: 1, max: 3 });
      case 'int':
      case 'integer':
      case 'number':
        return faker.number.int({ min: 1, max: 1000 });
      case 'float':
      case 'double':
      case 'decimal':
        return faker.number.float({ min: 0, max: 1000, fractionDigits: 2 });
      case 'boolean':
      case 'bool':
        return faker.datatype.boolean();
      case 'date':
      case 'datetime':
      case 'timestamp':
        return faker.date.past();
      case 'uuid':
      case 'guid':
        return faker.string.uuid();
      case 'object':
        return {
          key: faker.lorem.word(),
          value: faker.lorem.sentence()
        };
      case 'array':
        return [];
      case 'null':
        return null;
      default:
        // If we don't recognize the type, generate a basic string
        return faker.lorem.words({ min: 1, max: 3 });
    }
  }

  private registerDefaultGenerators(): void {
    // Email generators with context awareness
    this.registerTypeGenerator({
      name: 'email',
      patterns: ['email', 'mail', /.*email.*/i],
      priority: 100,
      generate: (_field, context) => {
        // Try to use related name fields for realistic emails
        const firstName = context?.relatedFields?.['firstName'] || context?.relatedFields?.['name'];
        const lastName = context?.relatedFields?.['lastName'];
        
        if (firstName && lastName) {
          return faker.internet.email({ firstName, lastName });
        } else if (firstName) {
          return faker.internet.email({ firstName });
        }
        return faker.internet.email();
      }
    });

    // Name generators
    this.registerTypeGenerator({
      name: 'name',
      patterns: ['name', 'fullname', 'username', 'displayname'],
      priority: 90,
      generate: () => faker.person.fullName()
    });

    this.registerTypeGenerator({
      name: 'firstName',
      patterns: ['firstname', 'first_name', 'fname'],
      priority: 90,
      generate: () => faker.person.firstName()
    });

    this.registerTypeGenerator({
      name: 'lastName',
      patterns: ['lastname', 'last_name', 'lname', 'surname'],
      priority: 90,
      generate: () => faker.person.lastName()
    });

    // URL/Website generators
    this.registerTypeGenerator({
      name: 'url',
      patterns: ['url', 'website', 'homepage', 'link', /.*url.*/i],
      priority: 85,
      generate: () => faker.internet.url()
    });

    // Phone generators
    this.registerTypeGenerator({
      name: 'phone',
      patterns: ['phone', 'telephone', 'mobile', /.*phone.*/i],
      priority: 85,
      generate: () => faker.phone.number()
    });

    // Address generators
    this.registerTypeGenerator({
      name: 'address',
      patterns: ['address', 'street', 'location'],
      priority: 80,
      generate: () => faker.location.streetAddress()
    });

    this.registerTypeGenerator({
      name: 'city',
      patterns: ['city', 'town'],
      priority: 80,
      generate: () => faker.location.city()
    });

    this.registerTypeGenerator({
      name: 'country',
      patterns: ['country', 'nation'],
      priority: 80,
      generate: () => faker.location.country()
    });

    // Content generators
    this.registerTypeGenerator({
      name: 'title',
      patterns: ['title', 'heading', 'subject'],
      priority: 75,
      generate: () => faker.lorem.sentence({ min: 3, max: 8 })
    });

    this.registerTypeGenerator({
      name: 'description',
      patterns: ['description', 'desc', 'summary', 'bio'],
      priority: 75,
      generate: () => faker.lorem.paragraph({ min: 1, max: 3 })
    });

    this.registerTypeGenerator({
      name: 'content',
      patterns: ['content', 'body', 'text', 'message'],
      priority: 75,
      generate: () => faker.lorem.paragraphs({ min: 1, max: 4 })
    });

    // ID generators
    this.registerTypeGenerator({
      name: 'id',
      patterns: ['id', '_id', /.*id$/i],
      priority: 95,
      generate: () => faker.string.uuid()
    });
  }

  private registerDefaultFormats(): void {
    // JSON Schema / OpenAPI formats
    this.registerFormatGenerator({
      format: 'email',
      baseType: 'string',
      generate: (_field, context) => {
        const firstName = context?.relatedFields?.['firstName'] || context?.relatedFields?.['name'];
        const lastName = context?.relatedFields?.['lastName'];
        
        if (firstName && lastName) {
          return faker.internet.email({ firstName, lastName });
        }
        return faker.internet.email();
      }
    });

    this.registerFormatGenerator({
      format: 'uri',
      baseType: 'string',
      generate: () => faker.internet.url()
    });

    this.registerFormatGenerator({
      format: 'url',
      baseType: 'string',
      generate: () => faker.internet.url()
    });

    this.registerFormatGenerator({
      format: 'date',
      baseType: 'string',
      generate: () => faker.date.past().toISOString().split('T')[0]
    });

    this.registerFormatGenerator({
      format: 'date-time',
      baseType: 'string',
      generate: () => faker.date.past().toISOString()
    });

    this.registerFormatGenerator({
      format: 'time',
      baseType: 'string',
      generate: () => faker.date.recent().toTimeString().split(' ')[0]
    });

    this.registerFormatGenerator({
      format: 'uuid',
      baseType: 'string',
      generate: () => faker.string.uuid()
    });

    this.registerFormatGenerator({
      format: 'ipv4',
      baseType: 'string',
      generate: () => faker.internet.ip()
    });

    this.registerFormatGenerator({
      format: 'ipv6',
      baseType: 'string',
      generate: () => faker.internet.ipv6()
    });

    this.registerFormatGenerator({
      format: 'hostname',
      baseType: 'string',
      generate: () => faker.internet.domainName()
    });

    this.registerFormatGenerator({
      format: 'password',
      baseType: 'string',
      generate: () => faker.internet.password({ length: 12 })
    });
  }

  private registerDefaultScalars(): void {
    // GraphQL custom scalars
    this.registerScalarGenerator({
      scalarName: 'EmailAddress',
      generate: (_field, context) => {
        const firstName = context?.relatedFields?.['firstName'] || context?.relatedFields?.['name'];
        const lastName = context?.relatedFields?.['lastName'];
        
        if (firstName && lastName) {
          return faker.internet.email({ firstName, lastName });
        }
        return faker.internet.email();
      }
    });

    this.registerScalarGenerator({
      scalarName: 'URL',
      generate: () => faker.internet.url()
    });

    this.registerScalarGenerator({
      scalarName: 'JSON',
      generate: () => ({
        key: faker.lorem.word(),
        value: faker.lorem.sentence(),
        timestamp: faker.date.recent().toISOString()
      })
    });

    this.registerScalarGenerator({
      scalarName: 'DateTime',
      generate: () => faker.date.past().toISOString()
    });

    this.registerScalarGenerator({
      scalarName: 'Date',
      generate: () => faker.date.past().toISOString().split('T')[0]
    });

    this.registerScalarGenerator({
      scalarName: 'Time',
      generate: () => faker.date.recent().toTimeString().split(' ')[0]
    });

    this.registerScalarGenerator({
      scalarName: 'UUID',
      generate: () => faker.string.uuid()
    });

    this.registerScalarGenerator({
      scalarName: 'PhoneNumber',
      generate: () => faker.phone.number()
    });

    this.registerScalarGenerator({
      scalarName: 'PostalCode',
      generate: () => faker.location.zipCode()
    });

    this.registerScalarGenerator({
      scalarName: 'CountryCode',
      generate: () => faker.location.countryCode()
    });
  }

  private registerContextualGenerators(): void {
    // Context-aware generators that consider field name + type + related data
    this.registerTypeGenerator({
      name: 'userEmail',
      patterns: [], // No pattern matching, only explicit context
      priority: 110,
      generate: (field, context) => {
        if (field.name.toLowerCase().includes('email') && context?.modelName.toLowerCase().includes('user')) {
          const firstName = context?.relatedFields?.['firstName'] || context?.relatedFields?.['name'];
          const lastName = context?.relatedFields?.['lastName'];
          
          if (firstName && lastName) {
            return faker.internet.email({ firstName, lastName });
          } else if (firstName) {
            return faker.internet.email({ firstName });
          }
        }
        return faker.internet.email();
      }
    });
  }

  // Get all registered generators for debugging
  getRegisteredGenerators(): {
    types: string[];
    formats: string[];
    scalars: string[];
  } {
    return {
      types: Array.from(this.typeGenerators.keys()),
      formats: Array.from(this.formatGenerators.keys()),
      scalars: Array.from(this.scalarGenerators.keys())
    };
  }
}

// Singleton instance
export const extensibleTypeSystem = new ExtensibleTypeSystem();
