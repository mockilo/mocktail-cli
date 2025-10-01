# Comprehensive Schema Examples

This directory contains example schemas for all supported schema types in mocktail-cli.

## Schema Types

### Database Schemas
- **Prisma** (`prisma.prisma`) - Database schema with relations
- **SQL DDL** (`schema.sql`) - SQL table definitions
- **Mongoose** (`mongoose.js`) - MongoDB schemas
- **Sequelize** (`sequelize.js`) - SQL ORM models

### API Schemas
- **GraphQL** (`schema.graphql`) - GraphQL type definitions
- **OpenAPI** (`openapi.yaml`) - REST API specification
- **JSON Schema** (`schema.json`) - Data validation schema

### Type Definitions
- **TypeScript** (`types.ts`) - Interface and type definitions
- **Protocol Buffers** (`schema.proto`) - Google's data serialization
- **Avro** (`schema.avsc`) - Apache Avro schema
- **XML Schema** (`schema.xsd`) - XML document structure

### Validation Schemas
- **Joi** (`joi.js`) - Object schema validation
- **Yup** (`yup.js`) - Schema validation library
- **Zod** (`zod.ts`) - TypeScript-first schema validation

## Usage

Test each schema type:

```bash
# Prisma
mocktail-cli generate --schema comprehensive-examples/prisma.prisma --type prisma --count 5

# GraphQL
mocktail-cli generate --schema comprehensive-examples/schema.graphql --type graphql --count 5

# TypeScript
mocktail-cli generate --schema comprehensive-examples/types.ts --type typescript --count 5

# Batch processing
mocktail-cli generate --batch --count 3
```

## Features Demonstrated

- **Relations**: User-Post-Comment relationships
- **Data Types**: Strings, numbers, booleans, dates, arrays
- **Constraints**: Required fields, unique constraints, defaults
- **Complex Types**: Nested objects, unions, enums
- **Real-world Patterns**: Common field naming conventions
