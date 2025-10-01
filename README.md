# Mocktail-CLI

**Note:** `.env` file was sanitized in this package release. Use `.env.example` to set `DATABASE_URL` before running anything that needs a DB.




> **Mocktail‑CLI** — The comprehensive schema‑aware mock data generator for developers. Generate realistic, relation‑aware mock data from any schema type directly from the command line with enhanced relation detection, performance optimization, and extensible plugin system.

---

## Table of contents

1. [What is Mocktail‑CLI?](#what-is-mocktail-cli)
2. [Key features](#key-features)
3. [Enhanced features (v1.3+)](#enhanced-features-v13)
4. [Why use Mocktail‑CLI?](#why-use-mocktail-cli)
5. [Quickstart](#quickstart)
6. [CLI reference (examples)](#cli-reference-examples)
7. [Configuration](#configuration)
8. [Example workflows](#example-workflows)
9. [Plugin system](#plugin-system)
10. [Performance optimization](#performance-optimization)
11. [Competitor comparison](#competitor-comparison)
12. [Roadmap](#roadmap)
13. [Contributing](#contributing)
14. [License & Contact](#license--contact)

---

## What is Mocktail‑CLI?

Mocktail-CLI is the most comprehensive schema-aware CLI tool for generating realistic mock data based on any schema type. It supports **15+ schema types** including Prisma, GraphQL, JSON Schema, OpenAPI, TypeScript, Protocol Buffers, Avro, XML Schema, SQL DDL, Mongoose, Sequelize, Joi, Yup, Zod, and more with nested relations, circular relation handling, deterministic seeds, schema auto-detection, and multiple output formats. Perfect for building, testing, and prototyping without waiting on backend data.

---

## Key features

* **Comprehensive schema support** — works with 15+ schema types including Prisma, GraphQL, JSON Schema, OpenAPI, TypeScript, Protocol Buffers, Avro, XML Schema, SQL DDL, Mongoose, Sequelize, Joi, Yup, Zod, and more.
* **Schema auto-detection** — automatically finds and validates schema files.
* **Advanced relation presets** — generate realistic domain graphs (blog, ecommerce, social).
* **Schema-aware generation** — matches model types and relations across all schema types.
* **Relation handling** — supports deep and circular relations with controlled `--depth`.
* **Deterministic seeds** — reproducible datasets with `--seed` and `--seed-value`.
* **Multiple output formats** — JSON, SQL, CSV, TypeScript.
* **Custom generators** — define per-model faker rules in `mocktail-cli.config.js`.
* **CLI-first** — quick commands for generate, seed, and export.

---

## Enhanced features (v1.3+)

### 🧠 Enhanced Relation Detection
* **Multi-strategy detection** — Direct references, foreign keys, naming conventions, schema annotations, and inference
* **Confidence scoring** — Each detected relation has a confidence score (0-1) with configurable thresholds
* **Advanced patterns** — Supports complex naming conventions like `userId`, `user_id`, `userRef`, `posts`, `userList`
* **Schema annotations** — Recognizes `@relation`, `@belongsTo`, `@hasMany` patterns

### 🚨 Better Error Messages
* **Contextual information** — Schema path, model names, field names, line numbers
* **Actionable suggestions** — Step-by-step solutions for common issues
* **Documentation links** — Direct links to relevant documentation
* **Severity levels** — Critical, high, medium, low severity indicators

### ⚡ Performance Optimization
* **Memory monitoring** — Real-time memory usage tracking with automatic pressure handling
* **Intelligent batching** — Automatic batch size calculation based on available memory
* **Progress tracking** — Real-time progress indicators with ETA and speed monitoring
* **Timeout protection** — Configurable timeout limits with automatic cleanup

### 🔌 Plugin System
* **Extensible architecture** — Custom generators, validators, and transformers
* **Built-in plugins** — Date generator, email generator, and custom validator plugins
* **Plugin management** — Load, enable, disable, and configure plugins
* **Hook system** — Execute code at various stages of generation

### 🎨 UI/UX Improvements
* **Enhanced output formatting** — Color-coded messages and structured information
* **Progress indicators** — Real-time progress bars with batch tracking
* **Better CLI experience** — Improved help messages and verbose output options

---

## Why use Mocktail‑CLI?

* **Save development time** — no more hand‑crafting mock data.
* **Build realistic prototypes** — frontend and backend can develop in parallel.
* **Reliable testing** — deterministic seeds make tests repeatable.
* **Flexible outputs** — works with files, databases, or API mocks.

---

## Quickstart

### Install

```bash
# global install
npm i -g mocktail-cli

# or run on demand
npx mocktail-cli generate --help
```

### Generate mock data from any schema

```bash
# Prisma schema
npx mocktail-cli generate \
  --schema ./prisma/schema.prisma \
  --type prisma \
  --models User,Post \
  --count 50 \
  --out ./mocks/data.json \
  --format json \
  --seed

# GraphQL schema
npx mocktail-cli generate \
  --schema ./schema.graphql \
  --type graphql \
  --models User,Post \
  --count 50

# JSON Schema
npx mocktail-cli generate \
  --schema ./schema.json \
  --type json-schema \
  --count 50

# OpenAPI specification
npx mocktail-cli generate \
  --schema ./openapi.yaml \
  --type openapi \
  --count 50

# TypeScript interfaces
npx mocktail-cli generate \
  --schema ./types.ts \
  --type typescript \
  --count 50

# Protocol Buffers
npx mocktail-cli generate \
  --schema ./schema.proto \
  --type protobuf \
  --count 50

# Avro schema
npx mocktail-cli generate \
  --schema ./schema.avsc \
  --type avro \
  --count 50

# XML Schema
npx mocktail-cli generate \
  --schema ./schema.xsd \
  --type xml-schema \
  --count 50

# SQL DDL
npx mocktail-cli generate \
  --schema ./schema.sql \
  --type sql-ddl \
  --count 50

# Mongoose schemas
npx mocktail-cli generate \
  --schema ./models.js \
  --type mongoose \
  --count 50

# Sequelize models
npx mocktail-cli generate \
  --schema ./models.js \
  --type sequelize \
  --count 50

# Joi validation schemas
npx mocktail-cli generate \
  --schema ./validation.js \
  --type joi \
  --count 50

# Yup validation schemas
npx mocktail-cli generate \
  --schema ./validation.js \
  --type yup \
  --count 50

# Zod schemas
npx mocktail-cli generate \
  --schema ./validation.ts \
  --type zod \
  --count 50
```

* `--depth 2` — set how deep nested relations go (depth > 1 enables relations).
* `--relations` — enable automatic relation generation (works with any depth).
* `--out` — output to a file or stdout.
* `--preset blog` — generate domain-specific data.

## Supported Schema Types

Mocktail-CLI supports **15+ schema types** out of the box:

| Schema Type | File Extensions | Description | Auto-Detection |
|-------------|----------------|-------------|----------------|
| **Prisma** | `.prisma` | Database schema definitions | ✅ |
| **GraphQL** | `.graphql`, `.gql` | API schema definitions | ✅ |
| **JSON Schema** | `.json` | Data validation schemas | ✅ |
| **OpenAPI** | `.yaml`, `.yml`, `.json` | API specification schemas | ✅ |
| **TypeScript** | `.ts`, `.tsx` | Interface and type definitions | ✅ |
| **Protocol Buffers** | `.proto` | Google's data serialization format | ✅ |
| **Avro** | `.avsc`, `.avro` | Apache Avro data serialization | ✅ |
| **XML Schema** | `.xsd` | XML document structure definitions | ✅ |
| **SQL DDL** | `.sql` | Database table definitions | ✅ |
| **Mongoose** | `.js` | MongoDB object modeling | ✅ |
| **Sequelize** | `.js` | SQL ORM model definitions | ✅ |
| **Joi** | `.js` | Object schema validation | ✅ |
| **Yup** | `.js` | Schema validation library | ✅ |
| **Zod** | `.ts`, `.js` | TypeScript-first schema validation | ✅ |

### Auto-Detection

Mocktail-CLI automatically detects schema types based on:
- **File extensions** (e.g., `.prisma` → Prisma, `.graphql` → GraphQL)
- **File content patterns** (e.g., `model User` → Prisma, `type User` → GraphQL)
- **Import statements** (e.g., `import * as mongoose` → Mongoose)

You can also explicitly specify the schema type using `--type`:

```bash
# Auto-detect schema type
mocktail-cli generate --schema ./my-schema

# Explicitly specify schema type
mocktail-cli generate --schema ./my-schema --type typescript
```

---

## CLI reference (examples)

### Basic usage
```bash
# Generate 20 Users (flat records)
mocktail-cli generate --models User --count 20

# Generate Users and Posts with specific counts
mocktail-cli generate --models User,Post --count 10,30 --out ./mocks

# Generate SQL inserts instead of JSON
mocktail-cli generate --format sql --out ./seeds

# Use a preset for ecommerce data
mocktail-cli generate --preset ecommerce --count 100
```

### Understanding --depth and --relations flags

The `--depth` and `--relations` flags work independently to control relation generation:

```bash
# Flat records (no relations)
mocktail-cli generate --count 5
# or
mocktail-cli generate --depth 1 --count 5

# Nested relations with depth 2
mocktail-cli generate --depth 2 --count 5

# Enable relations with default depth (2)
mocktail-cli generate --relations --count 5

# Both flags work together
mocktail-cli generate --relations --depth 3 --count 5

# Disable relations even with depth > 1
mocktail-cli generate --depth 2 --no-nest --count 5
```

**Key points:**
- `--depth 1` = Flat records (no nesting)
- `--depth 2+` = Enables relations with specified nesting level
- `--relations` = Enables relations with default depth of 2
- `--no-nest` = Disables relations regardless of other flags

# Full option list

## Basic Options
| Option | Alias | Description |
|--------|-------|-------------|
| `-c, --count <number>` | | Number of records per model (default: 5) |
| `-o, --out <directory>` | | Output directory |
| `-f, --format <type>` | | Output format: json, sql, ts, csv (default: json) |
| `-s, --schema <path>` | | Schema path (default: ./prisma/schema.prisma, auto-detect enabled) |
| `-t, --type <type>` | | Schema type: prisma, graphql, json-schema, openapi (auto-detected if not specified) |
| `-m, --models <models>` | | Comma-separated list of models (optional) |
| `--mock-config <path>` | | Path to mocktail-cli.config.js |
| `-d, --depth <number>` | | Nested relation depth - depth > 1 enables relations (default: 1) |
| `--no-nest` | | Disable nested relations (flat structure) |
| `--relations` | | Enable automatic relation generation (works with any depth) |
| `--dedupe` | | Enable deduplication of records |
| `--pretty` | | Pretty-print JSON output (default: true) |
| `--no-pretty` | | Disable pretty-printing JSON output |
| `--no-log` | | Suppress console logs during mock generation |
| `--seed` | | Insert generated data into DB |
| `--seed-value <number>` | | Seed value for reproducible data generation |
| `--preset <type>` | | Relation preset: blog, ecommerce, social |
| `--force-logo` | | Force show the logo animation even if shown before |
| `-h, --help` | | Display help with usage and examples |

## Enhanced Options (v1.3+)
| Option | Description |
|--------|-------------|
| `--enable-advanced-relations` | Enable enhanced relation detection with confidence scoring |
| `--relation-confidence <threshold>` | Set relation detection confidence threshold (0-1, default: 0.5) |
| `--performance-mode` | Enable performance optimizations for large datasets |
| `--memory-limit <mb>` | Set memory limit in MB (default: 1024) |
| `--batch-size <size>` | Set batch size for processing (default: 1000) |
| `--enable-plugins` | Enable plugin system |
| `--plugin-dir <path>` | Directory to load plugins from |
| `--verbose` | Enable verbose output with detailed information |
| `--quiet` | Suppress output except errors |
| `--no-logo` | Suppress logo output globally |

```
---

## Configuration

Define a `mocktail-cli.config.js` or `mocktail-cli.config.json` to customize generation.

```js
module.exports = {
  defaults: { locale: 'en', seedConsistency: true },
  models: {
    User: { count: 20, faker: { name: 'fullName', email: 'email' } },
    Post: { count: 50, relations: { author: { connectBy: 'User' } } }
  }
}
```

---

## Plugin system

### Built-in Plugins

Mocktail-CLI includes several built-in plugins for enhanced data generation:

#### Date Generator Plugin
```bash
# Automatically generates context-aware dates
mocktail-cli generate --enable-plugins --count 100
```

#### Email Generator Plugin
```bash
# Generates realistic email addresses with domain patterns
mocktail-cli generate --enable-plugins --count 100
```

### Creating Custom Plugins

```javascript
// plugins/my-generator.js
module.exports = {
  name: 'my-generator',
  version: '1.0.0',
  description: 'Custom data generator',
  
  generators: [
    {
      name: 'customField',
      fieldTypes: ['string'],
      generate: (field, context) => `custom-${Math.random()}`,
      validate: (field) => field.name === 'customField'
    }
  ],
  
  hooks: {
    beforeGeneration: async (context) => {
      console.log('🚀 Custom plugin activated!');
    }
  }
};
```

### Using Plugins

```bash
# Load plugins from directory
mocktail-cli generate --enable-plugins --plugin-dir ./plugins

# Use with specific models
mocktail-cli generate --models User --enable-plugins --count 1000
```

---

## Performance optimization

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

### Memory-Optimized Generation

```bash
# Limited memory environment
mocktail-cli generate \
  --count 50000 \
  --performance-mode \
  --memory-limit 1024 \
  --batch-size 1000 \
  --format csv
```

### Performance Configuration

```javascript
// mocktail-cli.config.js
module.exports = {
  performance: {
    maxMemoryUsage: 2048, // MB
    batchSize: 1000,
    enableMemoryMonitoring: true,
    enableProgressTracking: true,
    timeoutMs: 300000 // 5 minutes
  }
};
```

---

## Example workflows

### Frontend prototyping

1. Generate realistic data with relations: `mocktail-cli generate --relations --count 50`
2. Feed the output to your mock API server.

### Testing with consistent seeds

1. Generate with seed: `mocktail-cli generate --relations --seed --seed-value 42` 
2. Run tests with consistent fixtures.

### Deep nested data for complex UIs

1. Generate deeply nested data: `mocktail-cli generate --depth 3 --count 20`
2. Perfect for testing complex component hierarchies.

### Domain-specific seeding

`mocktail-cli generate --preset social --relations --count 100 --seed`

### Enhanced workflows (v1.3+)

#### Large dataset generation with performance optimization
```bash
# Generate 1 million records with all optimizations
mocktail-cli generate \
  --count 1000000 \
  --performance-mode \
  --memory-limit 8192 \
  --batch-size 5000 \
  --enable-advanced-relations \
  --format sql \
  --out ./large-dataset
```

#### Plugin-enhanced generation
```bash
# Use custom plugins for enhanced data generation
mocktail-cli generate \
  --enable-plugins \
  --plugin-dir ./custom-plugins \
  --enable-advanced-relations \
  --count 10000
```

#### Production-ready data generation
```bash
# Full production setup with all enhancements
mocktail-cli generate \
  --schema ./schema.prisma \
  --count 100000 \
  --enable-advanced-relations \
  --relation-confidence 0.8 \
  --performance-mode \
  --memory-limit 4096 \
  --batch-size 2000 \
  --enable-plugins \
  --format json \
  --out ./production-data \
  --seed \
  --seed-value 42
```

---

##  Competitor Comparison

How **Mocktail-CLI** compares with other schema-aware mock data tools:

| Feature / Tool                              | **Mocktail-CLI** | Prisma-Seed | Prisma-Generator-Fake | Mockoon / MirageJS | faker-js |
|---------------------------------------------|-----------------|-------------|----------------------|------------------|----------|
| Multi-schema support (Prisma, GraphQL, etc.)| ✅ Yes          | ❌ No       | ❌ No                | ❌ No             | ❌ No    |
| Schema aware (reads schema)                 | ✅ Yes          | ✅ Yes      | ✅ Yes               | ❌ No             | ❌ No    |
| Auto-detect schema files                    | ✅ Yes          | ❌ No       | ❌ No                | ❌ No             | ❌ No    |
| Handles relations (deep / circular-safe)    | ✅ Deep + safe  | ⚠️ Limited | ⚠️ Limited           | ❌ Manual         | ❌ No    |
| Deterministic seeds                         | ✅ `--seed-value`| ⚠️ Partial | ⚠️ Partial           | ❌ No             | ✅*      |
| Output formats                              | ✅ JSON / SQL / CSV / TS | ❌ Mostly JSON | ❌ Mostly JSON | ✅ JSON / API   | ⚠️ Code-driven only |
| CLI-first workflow                           | ✅ Yes          | ⚠️ Partial | ⚠️ Plugin-only       | ✅ Yes (server)   | ❌ No    |
| Relation presets (blog / ecommerce / social)| ✅ Built-in     | ❌ No       | ❌ No                | ❌ No             | ❌ No    |
| DB seeding                                  | ✅ Yes          | ❌ No       | ❌ No                | ❌ No             | ❌ No    |
| Extensible config                            | ✅ `mocktail-cli.config.js` | ⚠️ Partial | ⚠️ Partial     | ⚠️ Partial       | ⚠️ Manual only |
| **Enhanced relation detection**              | ✅ **NEW**      | ❌ No       | ❌ No                | ❌ No             | ❌ No    |
| **Performance optimization**                | ✅ **NEW**      | ❌ No       | ❌ No                | ❌ No             | ❌ No    |
| **Plugin system**                           | ✅ **NEW**      | ❌ No       | ❌ No                | ❌ No             | ❌ No    |
| **Better error messages**                   | ✅ **NEW**      | ❌ No       | ❌ No                | ❌ No             | ❌ No    |
| **Large dataset support**                   | ✅ **NEW**      | ❌ No       | ❌ No                | ❌ No             | ❌ No    |

\* `faker-js` supports `faker.seed(...)` for deterministic values, but it is **not schema-aware** and **doesn’t handle relations automatically**.  

❤️ Mocktail-CLI uses `@faker-js/faker` internally for realistic field data — every record feels lifelike.

Takeaway:
* Mocktail-CLI is the only multi-schema, CLI-first tool that:
  * Supports Prisma, GraphQL, JSON Schema, and OpenAPI schemas
  * Auto-detects your schema files
  * Generates deep relation-safe mock data
  * Supports reproducible seeds
  * Offers multiple output formats & realistic presets
  * **NEW in v1.3**: Enhanced relation detection with confidence scoring
  * **NEW in v1.3**: Performance optimization for large datasets (1M+ records)
  * **NEW in v1.3**: Extensible plugin system with built-in plugins
  * **NEW in v1.3**: Better error messages with contextual information
  * **NEW in v1.3**: Enhanced UI/UX with progress tracking and better output

## Roadmap

* v1.0: ✅ CLI complete with flags for depth, output formats, custom config.
* v1.1: ✅ Schema auto-detection, advanced relation presets (blog, ecommerce, social).
* v1.2: ✅ Multi-schema support (Prisma, GraphQL, JSON Schema, OpenAPI)
* v1.3: ✅ **Enhanced relation detection, performance optimization, plugin system, better error messages, UI/UX improvements**
* v1.4+: Integration with Mockilo for API mocking, seeding, and team workflows.
* v1.5+: Machine learning-powered relation detection, advanced plugins, web interface.

---

## Contributing

We welcome PRs, bug reports, and feature ideas.

1. Fork the repo
2. Create a feature branch
3. Submit PR with tests and docs

---

## License & Contact


**License Update:**
 From v1.1.1-beta.0, Mocktail-CLI is licensed under BSL-1.1. Older versions (<=1.1.0-beta.3) remain MIT.

---

* ☕🍹  Welcome to Mocktail CLI  🍹☕ 

Order up! Your personal code barista is here.
Serving fresh, Prisma-aware mock data, shaken not stirred.

