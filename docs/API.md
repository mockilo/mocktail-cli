# Mocktail-CLI API Documentation

## Table of Contents

- [Core Functions](#core-functions)
- [Schema Parsers](#schema-parsers)
- [Data Generation](#data-generation)
- [Plugin System](#plugin-system)
- [Utilities](#utilities)
- [Type Definitions](#type-definitions)

---

## Core Functions

### `generateMockData(model, options)`

Generate mock data for a single model.

**Parameters:**
- `model` (Model): The model definition containing fields and metadata
- `options` (GenerateOptions): Configuration options

**Options:**
```typescript
interface GenerateOptions {
  count?: number;              // Number of records to generate (default: 10)
  customFields?: Record<string, any>; // Custom field generators
  relationData?: Record<string, any>; // Pre-generated related data
  config?: Record<string, any>;       // Additional configuration
  preset?: string | null;             // Relation preset: 'blog', 'ecommerce', 'social'
}
```

**Returns:**
```typescript
interface GeneratedData {
  records: Record<string, any>[];  // Array of generated records
  joinTableRecords: Record<string, Array<{A: string; B: string}>>; // Many-to-many relations
}
```

**Example:**
```typescript
import { generateMockData } from 'mocktail-cli/src/generators/generateMockData';

const userModel = {
  name: 'User',
  fields: [
    { name: 'id', type: 'String', isId: true, isScalar: true },
    { name: 'email', type: 'String', isScalar: true },
    { name: 'name', type: 'String', isScalar: true }
  ],
  modelLevelUniques: []
};

const result = generateMockData(userModel, {
  count: 50,
  customFields: {
    email: (index) => `user${index}@example.com`
  }
});

console.log(result.records); // Array of 50 user objects
```

---

## Schema Parsers

### SchemaParser Interface

All schema parsers implement this interface:

```typescript
interface SchemaParser {
  getSchemaType(): string;
  getSupportedExtensions(): string[];
  canParse(filePath: string): boolean;
  parseSchema(schemaPath: string): SchemaModelsMap;
  validateSchema(schemaPath: string): SchemaValidation;
}
```

### Prisma Schema Parser

**Usage:**
```typescript
import { PrismaSchemaParser } from 'mocktail-cli/src/schema-parsers/prismaParser';

const parser = new PrismaSchemaParser();
const models = parser.parseSchema('./prisma/schema.prisma');

console.log(models); // { User: {...}, Post: {...} }
```

**Features:**
- Parses Prisma schema files (.prisma)
- Extracts models, fields, relations, and constraints
- Supports all Prisma field types
- Handles `@id`, `@unique`, `@default` attributes
- Detects circular dependencies

### GraphQL Schema Parser

**Usage:**
```typescript
import { GraphQLSchemaParser } from 'mocktail-cli/src/schema-parsers/graphqlParser';

const parser = new GraphQLSchemaParser();
const models = parser.parseSchema('./schema.graphql');
```

**Features:**
- Parses GraphQL schema files (.graphql, .gql)
- Supports types and interfaces
- Handles required fields (!)
- Detects array fields [Type]
- Supports custom scalars (DateTime, JSON, etc.)

### Schema Registry

Centralized parser management:

```typescript
import { SchemaRegistry } from 'mocktail-cli/src/schema-parsers/schemaRegistry';

const registry = SchemaRegistry.getInstance();

// Register a custom parser
registry.registerParser(new MyCustomParser());

// Auto-detect schema type
const parser = registry.getParserForFile('./schema.prisma');

// Parse with auto-detection
const models = registry.parseSchemaAuto('./schema.prisma');
```

---

## Data Generation

### Field Generators

Custom field generators for specific data types:

```typescript
import { generateField } from 'mocktail-cli/src/generators/baseGenerators';

const field = {
  name: 'email',
  type: 'String',
  isScalar: true
};

const value = generateField(field); // Auto-generates email-like string
```

### Extensible Type System

Register custom type generators:

```typescript
import { extensibleTypeSystem } from 'mocktail-cli/src/types/extensibleTypeSystem';

// Register a custom type generator
extensibleTypeSystem.registerTypeGenerator({
  name: 'UUID',
  patterns: ['uuid', 'UUID', /^.*Id$/],
  priority: 10,
  generate: () => crypto.randomUUID(),
  description: 'Generates UUID v4'
});

// Register a format generator
extensibleTypeSystem.registerFormatGenerator({
  name: 'email-corporate',
  format: 'email-corporate',
  priority: 5,
  generate: (field, context) => {
    return `${context.modelName.toLowerCase()}@company.com`;
  }
});
```

### Relation Presets

Pre-configured relation counts for common scenarios:

```typescript
import { relationPresets } from 'mocktail-cli/src/constants/relationPresets';

// Blog preset
const blogPreset = relationPresets.blog;
// { User: { posts: { count: { min: 1, max: 5 } } } }

// E-commerce preset
const ecommercePreset = relationPresets.ecommerce;

// Social network preset
const socialPreset = relationPresets.social;
```

---

## Plugin System

### Creating a Plugin

```typescript
import { Plugin } from 'mocktail-cli/src/plugins/pluginManager';

const myPlugin: Plugin = {
  name: 'my-custom-plugin',
  version: '1.0.0',
  description: 'Adds custom functionality',
  author: 'Your Name',
  
  // Lifecycle hooks
  hooks: {
    beforeGeneration: async (context) => {
      console.log(`Generating ${context.modelName}...`);
    },
    afterGeneration: async (context, data) => {
      console.log(`Generated ${data.length} records`);
    }
  },
  
  // Custom generators
  generators: [
    {
      name: 'company-email',
      description: 'Generates company email addresses',
      fieldTypes: ['email', 'Email'],
      generate: (field, context) => {
        return `${field.name}@company.com`;
      }
    }
  ]
};
```

### Loading Plugins

```typescript
import { pluginManager } from 'mocktail-cli/src/plugins/pluginManager';

// Load a single plugin
await pluginManager.loadPlugin('./plugins/my-plugin.js');

// Load all plugins from a directory
await pluginManager.loadPluginsFromDirectory('./plugins');

// Configure a plugin
pluginManager.configurePlugin('my-custom-plugin', {
  domain: 'example.com',
  prefix: 'user'
});

// Enable/disable plugins
pluginManager.disablePlugin('my-custom-plugin');
pluginManager.enablePlugin('my-custom-plugin');
```

### Plugin Hooks

Available lifecycle hooks:

- **beforeGeneration**: Called before generating data for a model
- **afterGeneration**: Called after generating data for a model
- **beforeSchemaParse**: Called before parsing a schema file
- **afterSchemaParse**: Called after parsing a schema file
- **onError**: Called when an error occurs

---

## Utilities

### Circular Dependency Resolver

Automatically resolves circular dependencies between models:

```typescript
import { circularDependencyResolver } from 'mocktail-cli/src/utils/circularDependencyResolver';

const result = circularDependencyResolver.resolveDependencies(models);

console.log(result.generationOrder); // Optimal order for data generation
console.log(result.cycles); // Detected circular dependencies
console.log(result.resolutionPlan); // How to handle cycles
```

**Resolution Strategies:**
- **smart-break**: Break cycles at optional relationships
- **lazy-loading**: Generate with null relations first, populate later
- **partial-references**: Generate with ID references only

### Locale Manager

Support for localized data generation:

```typescript
import { setGlobalLocale, createLocalizedFaker } from 'mocktail-cli/src/utils/localeManager';

// Set global locale
setGlobalLocale('es'); // Spanish

// Get localized faker instance
const faker = createLocalizedFaker('fr'); // French

// Generate localized data
const name = faker.person.fullName(); // French name
const address = faker.location.city(); // French city
```

**Supported Locales:** en, es, fr, de, it, pt, ja, ko, zh, ru, ar, and more

### Performance Optimizer

Monitor and optimize data generation performance:

```typescript
import { performanceOptimizer } from 'mocktail-cli/src/utils/performanceOptimizer';

// Start monitoring
performanceOptimizer.startGeneration();

// Update metrics
performanceOptimizer.updateMetrics(recordsGenerated, memoryUsed);

// Stop and get report
performanceOptimizer.stopGeneration();
const report = performanceOptimizer.getPerformanceReport();

console.log(report);
// Output:
// ⚡ Performance Report
// ├─ Duration: 1.234s
// ├─ Records: 1,000
// ├─ Rate: 810 records/sec
// └─ Memory: 45 MB
```

### Error Handler

Enhanced error handling with context:

```typescript
import { errorHandler } from 'mocktail-cli/src/utils/errorHandler';

try {
  // Your code
} catch (error) {
  const enhancedError = errorHandler.createEnhancedError(
    error,
    'GENERATION_ERROR',
    {
      schemaPath: './schema.prisma',
      modelName: 'User'
    }
  );
  
  errorHandler.logError(enhancedError);
}
```

---

## Type Definitions

### Model

```typescript
interface Model {
  name: string;
  fields: Field[];
  modelLevelUniques: string[][];
}
```

### Field

```typescript
interface Field {
  name: string;
  type: string;
  rawType: string;
  isArray: boolean;
  isOptional: boolean;
  isScalar: boolean;
  isRelation: boolean;
  isId: boolean;
  isUnique: boolean;
  hasDefault: boolean;
  relationFromFields?: string[];
  relationReferences?: string[];
  relationName?: string;
}
```

### GenerationContext

```typescript
interface GenerationContext {
  modelName: string;
  fieldName?: string;
  fieldType?: string;
  isArray?: boolean;
  isOptional?: boolean;
  recordIndex?: number;
  relatedFields?: Record<string, any>;
  schemaType?: string;
}
```

### SchemaValidation

```typescript
interface SchemaValidation {
  valid: boolean;
  errors: string[];
  path: string;
  schemaType: string;
}
```

---

## Advanced Examples

### Custom Field Generator with Context

```typescript
const result = generateMockData(model, {
  count: 100,
  customFields: {
    // Context-aware email generation
    email: (index, context) => {
      const name = context.record.name || 'user';
      return `${name.toLowerCase().replace(' ', '.')}@example.com`;
    },
    
    // Conditional generation
    status: (index) => {
      return index % 3 === 0 ? 'active' : 'inactive';
    }
  }
});
```

### Programmatic Schema Parsing

```typescript
import { SchemaRegistry } from 'mocktail-cli/src/schema-parsers/schemaRegistry';
import { generateMockData } from 'mocktail-cli/src/generators/generateMockData';

// Parse schema
const registry = SchemaRegistry.getInstance();
const models = registry.parseSchemaAuto('./schema.prisma');

// Generate data for all models
const allData = {};
for (const [modelName, model] of Object.entries(models)) {
  const result = generateMockData(model, { count: 20 });
  allData[modelName] = result.records;
}

console.log(allData);
```

### Batch Processing

```typescript
import { performanceOptimizer } from 'mocktail-cli/src/utils/performanceOptimizer';

const batchSize = 1000;
const totalRecords = 100000;

performanceOptimizer.startGeneration();

for (let i = 0; i < totalRecords; i += batchSize) {
  const batch = generateMockData(model, { count: batchSize });
  
  // Process batch
  await saveToDB(batch.records);
  
  // Update metrics
  performanceOptimizer.updateMetrics(batchSize, process.memoryUsage().heapUsed);
}

performanceOptimizer.stopGeneration();
console.log(performanceOptimizer.getPerformanceReport());
```

---

## Contributing

To extend Mocktail-CLI:

1. **Add a new schema parser**: Implement the `SchemaParser` interface
2. **Create custom generators**: Register with the extensible type system
3. **Build plugins**: Use the plugin system for reusable extensions
4. **Submit PRs**: Contributions are welcome!

For more information, see [CONTRIBUTING.md](../CONTRIBUTING.md)
