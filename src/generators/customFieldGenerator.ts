import { faker } from '@faker-js/faker';
import { SchemaField } from '../schema-parsers/baseSchemaParser';

export interface CustomGenerator {
  name: string;
  generate: (field: SchemaField, context?: any) => any;
}

export class CustomFieldGenerator {
  private generators: Map<string, CustomGenerator> = new Map();
  
  constructor() {
    this.registerDefaultGenerators();
  }
  
  registerGenerator(generator: CustomGenerator): void {
    this.generators.set(generator.name, generator);
  }
  
  generate(field: SchemaField, context?: any): any {
    // Check for custom generator by field name
    if (this.generators.has(field.name)) {
      return this.generators.get(field.name)!.generate(field, context);
    }
    
    // Check for custom generator by field type
    if (this.generators.has(field.type)) {
      return this.generators.get(field.type)!.generate(field, context);
    }
    
    // Use default generation
    return this.generateDefault(field, context);
  }
  
  private generateDefault(field: SchemaField, _context?: any): any {
    const { type, isArray, isOptional } = field;
    
    // Handle optional fields
    if (isOptional && Math.random() < 0.3) {
      return null;
    }
    
    // Handle array fields
    if (isArray) {
      const length = Math.floor(Math.random() * 3) + 1;
      return Array.from({ length }, () => this.generateScalarValue(type));
    }
    
    return this.generateScalarValue(type);
  }
  
  private generateScalarValue(type: string): any {
    switch (type.toLowerCase()) {
      case 'string':
        return faker.lorem.words(2);
      case 'int':
      case 'integer':
        return faker.number.int({ min: 1, max: 1000 });
      case 'float':
      case 'number':
        return faker.number.float({ min: 0, max: 100, fractionDigits: 2 });
      case 'boolean':
        return faker.datatype.boolean();
      case 'date':
      case 'datetime':
        return faker.date.recent();
      case 'email':
        return faker.internet.email();
      case 'url':
        return faker.internet.url();
      case 'uuid':
        return faker.string.uuid();
      default:
        return faker.lorem.word();
    }
  }
  
  private registerDefaultGenerators(): void {
    // Email generator
    this.registerGenerator({
      name: 'email',
      generate: () => faker.internet.email()
    });
    
    // Name generator
    this.registerGenerator({
      name: 'name',
      generate: () => faker.person.fullName()
    });
    
    // Title generator
    this.registerGenerator({
      name: 'title',
      generate: () => faker.lorem.sentence(3)
    });
    
    // Content generator
    this.registerGenerator({
      name: 'content',
      generate: () => faker.lorem.paragraphs(2)
    });
    
    // ID generator
    this.registerGenerator({
      name: 'id',
      generate: () => faker.string.uuid()
    });
    
    // URL generator
    this.registerGenerator({
      name: 'url',
      generate: () => faker.internet.url()
    });
    
    // Phone generator
    this.registerGenerator({
      name: 'phone',
      generate: () => faker.phone.number()
    });
    
    // Address generator
    this.registerGenerator({
      name: 'address',
      generate: () => faker.location.streetAddress()
    });
  }
}
