# Plugin Development Guide

Build powerful extensions for Mocktail-CLI with the plugin system.

## Table of Contents

- [Quick Start](#quick-start)
- [Plugin Structure](#plugin-structure)
- [Lifecycle Hooks](#lifecycle-hooks)
- [Custom Generators](#custom-generators)
- [Custom Validators](#custom-validators)
- [Custom Transformers](#custom-transformers)
- [Plugin Configuration](#plugin-configuration)
- [Examples](#examples)
- [Best Practices](#best-practices)

---

## Quick Start

### 1. Create a Plugin File

Create a new file `my-plugin.ts` (or `.js`):

```typescript
import { Plugin } from 'mocktail-cli/src/plugins/pluginManager';

const myPlugin: Plugin = {
  name: 'my-awesome-plugin',
  version: '1.0.0',
  description: 'Does awesome things',
  author: 'Your Name <email@example.com>',
  
  hooks: {
    beforeGeneration: async (context) => {
      console.log(`✨ Generating ${context.modelName}...`);
    }
  }
};

export default myPlugin;
```

### 2. Load the Plugin

```bash
# Via CLI flag
mocktail generate --schema schema.prisma --plugins ./plugins

# Or programmatically
import { pluginManager } from 'mocktail-cli';
await pluginManager.loadPlugin('./my-plugin.ts');
```

---

## Plugin Structure

### Required Fields

```typescript
interface Plugin {
  name: string;           // Unique plugin identifier
  version: string;        // Semantic version
  description: string;    // Brief description
  
  // Optional fields
  author?: string;
  dependencies?: string[];  // Other plugin names required
  hooks?: PluginHooks;
  generators?: CustomGenerator[];
  validators?: CustomValidator[];
  transformers?: CustomTransformer[];
}
```

### Complete Example

```typescript
const fullPlugin: Plugin = {
  name: 'enterprise-data-plugin',
  version: '2.1.0',
  description: 'Enterprise-grade data generation with validation',
  author: 'DevTeam <dev@company.com>',
  dependencies: ['base-plugin'],
  
  hooks: {
    beforeGeneration: async (context) => {
      // Initialize resources
    },
    afterGeneration: async (context, data) => {
      // Cleanup or post-processing
    }
  },
  
  generators: [
    // Custom field generators
  ],
  
  validators: [
    // Custom data validators
  ],
  
  transformers: [
    // Custom data transformers
  ]
};
```

---

## Lifecycle Hooks

Hooks allow you to execute code at specific points in the generation process.

### Available Hooks

#### `beforeGeneration`

Called before generating data for a model.

```typescript
hooks: {
  beforeGeneration: async (context: GenerationContext) => {
    console.log(`Starting generation for: ${context.modelName}`);
    
    // Example: Log to external service
    await analytics.trackEvent('generation_started', {
      model: context.modelName,
      timestamp: Date.now()
    });
  }
}
```

#### `afterGeneration`

Called after data generation completes.

```typescript
hooks: {
  afterGeneration: async (context: GenerationContext, data: any) => {
    console.log(`Generated ${data.length} records for ${context.modelName}`);
    
    // Example: Post-process data
    if (context.modelName === 'User') {
      await sendWelcomeEmails(data);
    }
  }
}
```

#### `beforeSchemaParse`

Called before parsing a schema file.

```typescript
hooks: {
  beforeSchemaParse: async (schemaPath: string) => {
    console.log(`Parsing schema: ${schemaPath}`);
    
    // Example: Validate schema file exists
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema not found: ${schemaPath}`);
    }
  }
}
```

#### `afterSchemaParse`

Called after schema parsing completes.

```typescript
hooks: {
  afterSchemaParse: async (models: any) => {
    console.log(`Parsed ${Object.keys(models).length} models`);
    
    // Example: Auto-generate documentation
    await generateSchemaDocs(models);
  }
}
```

#### `onError`

Called when an error occurs during generation.

```typescript
hooks: {
  onError: async (error: Error, context: any) => {
    // Example: Send error to monitoring service
    await errorTracker.captureException(error, {
      context,
      timestamp: Date.now()
    });
    
    // Example: Send alert
    await slack.sendMessage(`🚨 Generation failed: ${error.message}`);
  }
}
```

---

## Custom Generators

Create custom field generators for specific data types.

### Basic Generator

```typescript
generators: [
  {
    name: 'company-email',
    description: 'Generates corporate email addresses',
    fieldTypes: ['email', 'Email', 'contactEmail'],
    
    generate: (field, context) => {
      const companyDomain = 'mycompany.com';
      const username = context.modelName.toLowerCase();
      return `${username}${context.recordIndex}@${companyDomain}`;
    }
  }
]
```

### Advanced Generator with Validation

```typescript
generators: [
  {
    name: 'sku-generator',
    description: 'Generates product SKUs',
    fieldTypes: ['sku', 'SKU', 'productCode'],
    
    validate: (field) => {
      // Only apply to Product model
      return field.name === 'sku';
    },
    
    generate: (field, context) => {
      const category = context.relatedFields?.category || 'GEN';
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      
      return `${category}-${timestamp}-${random}`;
    }
  }
]
```

### Context-Aware Generator

```typescript
generators: [
  {
    name: 'hierarchical-id',
    description: 'Generates hierarchical IDs based on relations',
    fieldTypes: ['id'],
    
    generate: (field, context) => {
      // Use parent ID as prefix if available
      const parentId = context.relations?.parentId || '000';
      const childIndex = context.recordIndex.toString().padStart(3, '0');
      
      return `${parentId}-${childIndex}`;
    }
  }
]
```

---

## Custom Validators

Validate generated data before it's written.

### Basic Validator

```typescript
validators: [
  {
    name: 'email-format',
    description: 'Validates email format',
    
    validate: (data, schema) => {
      const errors: string[] = [];
      const warnings: string[] = [];
      
      for (const record of data) {
        if (record.email && !record.email.includes('@')) {
          errors.push(`Invalid email: ${record.email}`);
        }
      }
      
      return { valid: errors.length === 0, errors, warnings };
    }
  }
]
```

### Advanced Validator

```typescript
validators: [
  {
    name: 'business-rules',
    description: 'Validates business logic constraints',
    
    validate: (data, schema) => {
      const errors: string[] = [];
      const warnings: string[] = [];
      
      for (const record of data) {
        // Rule: Users under 18 can't have premium accounts
        if (record.age < 18 && record.accountType === 'premium') {
          errors.push(`User ${record.id}: Minor cannot have premium account`);
        }
        
        // Rule: Products should have positive prices
        if (record.price && record.price <= 0) {
          errors.push(`Product ${record.id}: Price must be positive`);
        }
        
        // Warning: Check for reasonable values
        if (record.age && record.age > 120) {
          warnings.push(`User ${record.id}: Unusual age value (${record.age})`);
        }
      }
      
      return { valid: errors.length === 0, errors, warnings };
    }
  }
]
```

---

## Custom Transformers

Transform data between different formats.

### Basic Transformer

```typescript
transformers: [
  {
    name: 'json-to-xml',
    description: 'Converts JSON to XML format',
    inputFormats: ['json'],
    outputFormats: ['xml'],
    
    transform: (data, options) => {
      // Simple JSON to XML conversion
      const xmlBuilder = new XMLBuilder();
      return xmlBuilder.build(data);
    }
  }
]
```

### Advanced Transformer

```typescript
transformers: [
  {
    name: 'prisma-to-sequelize',
    description: 'Converts Prisma schema to Sequelize models',
    inputFormats: ['prisma'],
    outputFormats: ['sequelize'],
    
    transform: (data, options) => {
      const models = {};
      
      for (const [modelName, model] of Object.entries(data)) {
        models[modelName] = {
          tableName: options.tablePrefix + modelName,
          fields: model.fields.map(field => ({
            name: field.name,
            type: mapPrismaTypeToSequelize(field.type),
            allowNull: field.isOptional,
            primaryKey: field.isId
          }))
        };
      }
      
      return models;
    }
  }
]
```

---

## Plugin Configuration

Allow users to configure your plugin.

### Define Configuration Schema

```typescript
const plugin: Plugin = {
  name: 'configurable-plugin',
  version: '1.0.0',
  description: 'A plugin with user configuration',
  
  hooks: {
    beforeGeneration: async (context) => {
      // Access configuration
      const config = pluginManager.getPluginConfig('configurable-plugin');
      const apiKey = config?.options?.apiKey;
      const endpoint = config?.options?.endpoint || 'https://api.example.com';
      
      // Use configuration
      await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
    }
  }
};
```

### User Configuration

Users can configure your plugin:

```typescript
import { pluginManager } from 'mocktail-cli';

pluginManager.configurePlugin('configurable-plugin', {
  apiKey: 'your-api-key',
  endpoint: 'https://custom-endpoint.com',
  batchSize: 1000,
  enableLogging: true
});
```

---

## Examples

### Example 1: Audit Log Plugin

```typescript
const auditLogPlugin: Plugin = {
  name: 'audit-log',
  version: '1.0.0',
  description: 'Logs all generation activities',
  
  hooks: {
    beforeGeneration: async (context) => {
      await logActivity('generation_started', context);
    },
    
    afterGeneration: async (context, data) => {
      await logActivity('generation_completed', {
        ...context,
        recordCount: data.length
      });
    },
    
    onError: async (error, context) => {
      await logActivity('generation_failed', {
        context,
        error: error.message
      });
    }
  }
};

async function logActivity(event: string, data: any) {
  const timestamp = new Date().toISOString();
  const logEntry = { timestamp, event, data };
  
  // Write to file
  await fs.appendFile(
    'audit.log',
    JSON.stringify(logEntry) + '\n'
  );
}
```

### Example 2: Data Sanitization Plugin

```typescript
const sanitizationPlugin: Plugin = {
  name: 'data-sanitizer',
  version: '1.0.0',
  description: 'Sanitizes sensitive data',
  
  hooks: {
    afterGeneration: async (context, data) => {
      // Sanitize sensitive fields
      return data.map(record => {
        if (record.password) {
          record.password = hashPassword(record.password);
        }
        if (record.ssn) {
          record.ssn = maskSSN(record.ssn);
        }
        if (record.creditCard) {
          record.creditCard = maskCreditCard(record.creditCard);
        }
        return record;
      });
    }
  }
};

function maskSSN(ssn: string): string {
  return `***-**-${ssn.slice(-4)}`;
}

function maskCreditCard(cc: string): string {
  return `****-****-****-${cc.slice(-4)}`;
}
```

### Example 3: Multi-Language Plugin

```typescript
const multiLangPlugin: Plugin = {
  name: 'multi-language',
  version: '1.0.0',
  description: 'Generates multilingual content',
  
  generators: [
    {
      name: 'translated-content',
      description: 'Generates content in multiple languages',
      fieldTypes: ['title', 'description', 'content'],
      
      generate: (field, context) => {
        const config = pluginManager.getPluginConfig('multi-language');
        const languages = config?.options?.languages || ['en'];
        
        const translations = {};
        for (const lang of languages) {
          translations[lang] = generateTextInLanguage(field.name, lang);
        }
        
        return translations;
      }
    }
  ]
};
```

---

## Best Practices

### 1. Error Handling

Always handle errors gracefully:

```typescript
hooks: {
  beforeGeneration: async (context) => {
    try {
      await riskyOperation();
    } catch (error) {
      console.error(`Plugin error: ${error.message}`);
      // Don't throw - let generation continue
    }
  }
}
```

### 2. Performance

Keep hooks lightweight:

```typescript
// ❌ Bad: Heavy operation in hook
hooks: {
  afterGeneration: async (context, data) => {
    for (const record of data) {
      await slowDatabaseCall(record); // Slow!
    }
  }
}

// ✅ Good: Batch operations
hooks: {
  afterGeneration: async (context, data) => {
    await batchDatabaseInsert(data); // Fast!
  }
}
```

### 3. Configuration

Provide sensible defaults:

```typescript
const config = pluginManager.getPluginConfig('my-plugin');
const batchSize = config?.options?.batchSize || 1000; // Default: 1000
const timeout = config?.options?.timeout || 5000; // Default: 5000ms
```

### 4. Documentation

Document your plugin well:

```typescript
/**
 * Enterprise Data Generator Plugin
 * 
 * Generates enterprise-compliant mock data with:
 * - GDPR compliance
 * - Data classification
 * - Audit trails
 * 
 * Configuration:
 * - `region`: Data residency region (default: 'us')
 * - `classification`: Data classification level (default: 'internal')
 * - `auditEnabled`: Enable audit logging (default: true)
 * 
 * Example:
 * ```typescript
 * pluginManager.configurePlugin('enterprise-data', {
 *   region: 'eu',
 *   classification: 'confidential',
 *   auditEnabled: true
 * });
 * ```
 */
const enterprisePlugin: Plugin = { /* ... */ };
```

### 5. Testing

Test your plugins thoroughly:

```typescript
// plugin.test.ts
describe('MyPlugin', () => {
  test('should generate valid data', async () => {
    const context = { modelName: 'User', recordIndex: 0 };
    const result = await myPlugin.generators[0].generate({}, context);
    expect(result).toBeDefined();
  });
  
  test('should handle errors gracefully', async () => {
    // Test error scenarios
  });
});
```

---

## Publishing Your Plugin

### 1. Package Structure

```
my-mocktail-plugin/
├── src/
│   └── index.ts
├── dist/
│   └── index.js
├── package.json
├── README.md
└── LICENSE
```

### 2. Package.json

```json
{
  "name": "mocktail-plugin-awesome",
  "version": "1.0.0",
  "description": "An awesome Mocktail-CLI plugin",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "keywords": ["mocktail", "plugin", "data-generation"],
  "peerDependencies": {
    "mocktail-cli": "^1.4.0"
  }
}
```

### 3. Publish to npm

```bash
npm publish
```

### 4. Usage

```bash
npm install mocktail-plugin-awesome

# Use in code
import myPlugin from 'mocktail-plugin-awesome';
pluginManager.loadPlugin(myPlugin);
```

---

## Need Help?

- 📖 [API Documentation](./API.md)
- 💬 [GitHub Discussions](https://github.com/mockilo/mocktail-cli/discussions)
- 🐛 [Report Issues](https://github.com/mockilo/mocktail-cli/issues)
- 📧 Email: support@mocktail-cli.dev

Happy plugin development! 🎉
