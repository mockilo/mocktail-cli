import { faker } from '@faker-js/faker';
import { getLocalizedFaker } from '../utils/localeManager';
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
        return getLocalizedFaker().lorem.words(2);
      case 'int':
      case 'integer':
        return getLocalizedFaker().number.int({ min: 1, max: 1000 });
      case 'float':
      case 'number':
        return getLocalizedFaker().number.float({ min: 0, max: 100, fractionDigits: 2 });
      case 'boolean':
        return getLocalizedFaker().datatype.boolean();
      case 'date':
      case 'datetime':
        return getLocalizedFaker().date.recent();
      case 'email':
        return getLocalizedFaker().internet.email();
      case 'url':
        return getLocalizedFaker().internet.url();
      case 'uuid':
        return getLocalizedFaker().string.uuid();
      default:
        return getLocalizedFaker().lorem.word();
    }
  }
  
  private registerDefaultGenerators(): void {
    // Email generator
    this.registerGenerator({
      name: 'email',
      generate: () => getLocalizedFaker().internet.email()
    });
    
    // Name generator
    this.registerGenerator({
      name: 'name',
      generate: () => getLocalizedFaker().person.fullName()
    });
    
    // Title generator
    this.registerGenerator({
      name: 'title',
      generate: () => getLocalizedFaker().lorem.sentence(3)
    });
    
    // Content generator
    this.registerGenerator({
      name: 'content',
      generate: () => getLocalizedFaker().lorem.paragraphs(2)
    });
    
    // ID generator
    this.registerGenerator({
      name: 'id',
      generate: () => getLocalizedFaker().string.uuid()
    });
    
    // URL generator
    this.registerGenerator({
      name: 'url',
      generate: () => getLocalizedFaker().internet.url()
    });
    
    // Phone generator
    this.registerGenerator({
      name: 'phone',
      generate: () => getLocalizedFaker().phone.number()
    });
    
    // Address generator
    this.registerGenerator({
      name: 'address',
      generate: () => getLocalizedFaker().location.streetAddress()
    });
  }
}
