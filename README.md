# mocktail-cli

**Note:** .env file was sanitized in this package release. Use .env.example to set DATABASE_URL before running anything that needs a DB.

# Mocktail-cli

[![npm version](https://img.shields.io/npm/v/mocktail-cli.svg)](https://www.npmjs.com/package/mocktail-cli)

Mocktail-cli is a **Prisma-aware mock data generator CLI** that creates realistic mock data based on your Prisma schema.  
Generate mock records with relations, custom faker data, and export formats for easy development, testing, and seeding.

---

## Features

- Fully understands Prisma schema models and relations  
- Configurable mock data generation with `mocktail.config.js`  
- Uses faker.js for realistic fake data  
- Supports nested relations with configurable depth  
- Outputs JSON or other formats (SQL INSERT planned)  
- CLI-first: generate data with simple commands  
- Future-ready for multi-schema and seeding support  

---

## Installation

```bash
npm install -g mocktail-cli

```help

npx mocktail-cli generate --help
