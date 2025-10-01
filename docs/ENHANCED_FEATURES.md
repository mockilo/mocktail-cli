# Enhanced Features Guide

This guide covers the new enhanced features in Mocktail-CLI v1.3+, including advanced relation detection, improved error handling, performance optimizations, and the plugin system.

## Table of Contents

1. [Enhanced Relation Detection](#enhanced-relation-detection)
2. [Better Error Messages](#better-error-messages)
3. [Performance Optimization](#performance-optimization)
4. [Plugin System](#plugin-system)
5. [UI/UX Improvements](#uiux-improvements)
6. [Examples](#examples)

## Enhanced Relation Detection

### Overview

The enhanced relation detection system uses multiple strategies to identify relationships between models with confidence scoring and advanced pattern recognition.

### Features

- **Multi-strategy Detection**: Direct references, foreign keys, naming conventions, schema annotations, and inference
- **Confidence Scoring**: Each detected relation has a confidence score (0-1)
- **Advanced Patterns**: Supports complex naming conventions and schema annotations
- **Configurable Thresholds**: Set minimum confidence levels for relation detection

### Usage

```bash
# Enable advanced relation detection
mocktail-cli generate --enable-advanced-relations --relation-confidence 0.7

# Use enhanced detection with specific models
mocktail-cli generate --models User,Post --enable-advanced-relations
```

### Configuration

```javascript
// mocktail-cli.config.js
module.exports = {
  relationDetection: {
    enableAdvancedPatterns: true,
    enableSchemaAnnotations: true,
    enableInference: true,
    confidenceThreshold: 0.6
  }
};
```

### Detection Methods

1. **Direct References** (Confidence: 1.0)
   - Direct model type references in fields
   - Example: `user: User` in Prisma schema

2. **Schema Annotations** (Confidence: 0.9)
   - Explicit relation annotations
   - Example: `@relation("User")` in Prisma

3. **Foreign Key Patterns** (Confidence: 0.6-0.9)
   - Common foreign key naming patterns
   - Examples: `userId`, `user_id`, `userRef`

4. **Naming Conventions** (Confidence: 0.6-0.8)
   - Field name patterns indicating relations
   - Examples: `posts`, `userList`, `userCollection`

5. **Inference** (Confidence: 0.5)
   - Context-based relation inference
   - Based on field types and naming patterns

## Better Error Messages

### Overview

Enhanced error handling provides detailed, actionable error messages with context, suggestions, and documentation links.

### Features

- **Contextual Information**: Schema path, model names, field names, line numbers
- **Actionable Suggestions**: Step-by-step solutions for common issues
- **Documentation Links**: Direct links to relevant documentation
- **Severity Levels**: Critical, high, medium, low severity indicators
- **Related Files**: Suggestions for related files to check

### Error Types

#### Schema Errors
```bash
❌ Invalid schema: ./schema.prisma
📍 Context:
  Schema: ./schema.prisma
  Type: prisma
  Line: 15

💡 Suggestions:
  1. Check the schema syntax for errors
  2. Validate the schema file format
  3. Ensure all required fields are present
  4. Check for missing dependencies or imports

📚 Documentation: https://mocktail-cli.dev/docs/schema-validation
```

#### Model Errors
```bash
❌ Model not found in schema
📍 Context:
  Model: UserProfile
  Schema: ./schema.prisma

💡 Suggestions:
  1. Check if the model name is spelled correctly
  2. Ensure the model exists in the schema file
  3. Use --models to specify which models to generate
  4. List available models with --list-models
```

#### Performance Errors
```bash
⚠️ High memory usage detected. Consider reducing batch size or count.
📍 Context:
  Memory Usage: 1.2GB
  Batch Size: 1000
  Records Generated: 50,000

💡 Suggestions:
  1. Reduce the count of records to generate
  2. Use --batch-size to process data in smaller chunks
  3. Increase Node.js memory limit with --max-old-space-size
  4. Consider using --format sql for large datasets
```

## Performance Optimization

### Overview

Performance optimization features help handle large datasets efficiently with memory monitoring, batching, and progress tracking.

### Features

- **Memory Monitoring**: Real-time memory usage tracking
- **Intelligent Batching**: Automatic batch size calculation
- **Progress Tracking**: Real-time progress indicators
- **Timeout Protection**: Configurable timeout limits
- **Memory Pressure Handling**: Automatic garbage collection

### Usage

```bash
# Enable performance mode
mocktail-cli generate --performance-mode --memory-limit 2048 --batch-size 500

# Generate large dataset with optimizations
mocktail-cli generate --count 100000 --performance-mode
```

### Configuration

```javascript
// mocktail-cli.config.js
module.exports = {
  performance: {
    maxMemoryUsage: 2048, // MB
    batchSize: 1000,
    enableMemoryMonitoring: true,
    enableProgressTracking: true,
    timeoutMs: 300000, // 5 minutes
    enableCaching: true
  }
};
```

### Performance Report

After generation, you'll see a detailed performance report:

```
📊 Performance Report:
  ⏱️  Duration: 45.2s
  📈 Records Generated: 50,000
  🔗 Relations Processed: 125,000
  💾 Memory Usage: 1.2GB
  ⚡ Records/Second: 1,106
  📦 Batches: 50
  📏 Batch Size: 1,000
```

## Plugin System

### Overview

The plugin system allows you to extend Mocktail-CLI with custom generators, validators, and transformers.

### Features

- **Custom Generators**: Create field-specific data generators
- **Custom Validators**: Add data validation rules
- **Custom Transformers**: Transform data between formats
- **Hooks**: Execute code at various stages of generation
- **Plugin Management**: Load, enable, disable, and configure plugins

### Creating a Plugin

```javascript
// my-plugin.js
const myPlugin = {
  name: 'my-generator',
  version: '1.0.0',
  description: 'Custom data generator for my specific needs',
  author: 'Your Name',
  
  generators: [
    {
      name: 'customEmail',
      description: 'Generates company-specific email addresses',
      fieldTypes: ['email', 'string'],
      generate: (field, context) => {
        const domains = ['mycompany.com', 'example.org'];
        const domain = domains[Math.floor(Math.random() * domains.length)];
        return `user${Math.floor(Math.random() * 1000)}@${domain}`;
      },
      validate: (field) => field.name.toLowerCase().includes('email')
    }
  ],
  
  hooks: {
    beforeGeneration: async (context) => {
      console.log('🚀 Custom plugin activated!');
    }
  }
};

module.exports = myPlugin;
```

### Using Plugins

```bash
# Load plugins from directory
mocktail-cli generate --enable-plugins --plugin-dir ./plugins

# Use with specific models
mocktail-cli generate --models User --enable-plugins
```

### Built-in Plugins

Mocktail-CLI includes several built-in plugins:

#### Date Generator Plugin
- Generates realistic dates based on field context
- Supports birth dates, creation dates, expiration dates
- Context-aware date generation

#### Email Generator Plugin
- Creates realistic email addresses
- Domain pattern matching
- Name-based email generation

### Plugin Management

```bash
# List loaded plugins
mocktail-cli plugins list

# Enable/disable plugins
mocktail-cli plugins enable my-plugin
mocktail-cli plugins disable my-plugin

# Configure plugin options
mocktail-cli plugins configure my-plugin --option value
```

## UI/UX Improvements

### Enhanced CLI Output

- **Color-coded Messages**: Different colors for different message types
- **Progress Indicators**: Real-time progress bars and spinners
- **Structured Output**: Organized, easy-to-read information
- **Interactive Prompts**: User-friendly input prompts

### New CLI Options

```bash
# Enhanced relation detection
--enable-advanced-relations
--relation-confidence <threshold>

# Performance optimization
--performance-mode
--memory-limit <mb>
--batch-size <size>

# Plugin system
--enable-plugins
--plugin-dir <path>

# Better error handling
--verbose-errors
--error-context
```

### Output Examples

#### Success Output
```
✅ Schema validation passed
🔍 Found 5 models: User, Post, Comment, Category, Tag
🔗 Detected 12 relations with 0.8 average confidence
⚡ Performance mode enabled
📦 Processing in batches of 1000 records
🎯 Generating 10,000 records...
✅ Generation completed in 45.2s
```

#### Error Output
```
❌ Schema validation failed
📍 Context:
  Schema: ./schema.prisma
  Line: 15
  Error: Unexpected token

💡 Suggestions:
  1. Check syntax around line 15
  2. Ensure proper Prisma syntax
  3. Validate with Prisma CLI

📚 Documentation: https://mocktail-cli.dev/docs/prisma-syntax
```

## Examples

### Basic Usage with Enhanced Features

```bash
# Generate with all enhancements
mocktail-cli generate \
  --schema ./schema.prisma \
  --count 1000 \
  --enable-advanced-relations \
  --performance-mode \
  --enable-plugins \
  --format json \
  --out ./generated-data
```

### Large Dataset Generation

```bash
# Generate 100,000 records with performance optimizations
mocktail-cli generate \
  --count 100000 \
  --performance-mode \
  --memory-limit 4096 \
  --batch-size 2000 \
  --enable-advanced-relations
```

### Plugin Development

```bash
# Create plugin directory
mkdir plugins
cd plugins

# Create custom plugin
cat > custom-generator.js << 'EOF'
module.exports = {
  name: 'custom-generator',
  version: '1.0.0',
  description: 'Custom data generator',
  generators: [{
    name: 'customField',
    fieldTypes: ['string'],
    generate: (field, context) => `custom-${Math.random()}`,
    validate: (field) => field.name === 'customField'
  }]
};
EOF

# Use with plugin
mocktail-cli generate --enable-plugins --plugin-dir ./plugins
```

### Configuration File

```javascript
// mocktail-cli.config.js
module.exports = {
  // Enhanced relation detection
  relationDetection: {
    enableAdvancedPatterns: true,
    enableSchemaAnnotations: true,
    enableInference: true,
    confidenceThreshold: 0.7
  },
  
  // Performance optimization
  performance: {
    maxMemoryUsage: 2048,
    batchSize: 1000,
    enableMemoryMonitoring: true,
    enableProgressTracking: true,
    timeoutMs: 300000
  },
  
  // Plugin configuration
  plugins: {
    enabled: true,
    directory: './plugins',
    autoLoad: true
  },
  
  // Model-specific configuration
  models: {
    User: {
      count: 1000,
      faker: {
        name: 'fullName',
        email: 'email'
      }
    },
    Post: {
      count: 5000,
      relations: {
        author: { connectBy: 'User' }
      }
    }
  }
};
```

## Migration Guide

### From v1.2 to v1.3+

1. **Update CLI calls** to use new options:
   ```bash
   # Old
   mocktail-cli generate --count 1000
   
   # New (with enhancements)
   mocktail-cli generate --count 1000 --enable-advanced-relations --performance-mode
   ```

2. **Update configuration files** to include new options:
   ```javascript
   // Add to mocktail-cli.config.js
   module.exports = {
     // ... existing config
     relationDetection: { confidenceThreshold: 0.7 },
     performance: { maxMemoryUsage: 2048 }
   };
   ```

3. **Review error messages** - they now provide more detailed information and suggestions.

4. **Consider using plugins** for custom data generation needs.

## Troubleshooting

### Common Issues

#### Memory Issues
```bash
# Solution: Reduce batch size and enable performance mode
mocktail-cli generate --performance-mode --batch-size 500 --memory-limit 1024
```

#### Relation Detection Issues
```bash
# Solution: Lower confidence threshold
mocktail-cli generate --relation-confidence 0.3 --enable-advanced-relations
```

#### Plugin Loading Issues
```bash
# Solution: Check plugin directory and file format
mocktail-cli generate --enable-plugins --plugin-dir ./plugins --verbose
```

### Getting Help

- **Documentation**: https://mocktail-cli.dev/docs
- **GitHub Issues**: https://github.com/mockilo/mocktail-cli/issues
- **Community**: https://discord.gg/mocktail-cli

## Conclusion

The enhanced features in Mocktail-CLI v1.3+ provide:

- **Smarter relation detection** with confidence scoring
- **Better error messages** with actionable suggestions
- **Performance optimizations** for large datasets
- **Extensible plugin system** for custom needs
- **Improved UI/UX** with better CLI experience

These features make Mocktail-CLI more powerful, user-friendly, and suitable for production use cases with large, complex schemas.
