# Mocktail-CLI

**Note:** `.env` file was sanitized in this package release. Use `.env.example` to set `DATABASE_URL` before running anything that needs a DB.

[![npm version](https://img.shields.io/npm/v/mocktail-cli.svg)](https://www.npmjs.com/package/mocktail-cli)

> **Mocktail‑CLI** — The schema‑aware mock data generator for developers. Generate realistic, relation‑aware mock data from your Prisma schema directly from the command line.

---

## Table of contents

1. [What is Mocktail‑CLI?](#what-is-mocktail-cli)
2. [Key features](#key-features)
3. [Why use Mocktail‑CLI?](#why-use-mocktail-cli)
4. [Quickstart](#quickstart)
5. [CLI reference (examples)](#cli-reference-examples)
6. [Configuration](#configuration)
7. [Example workflows](#example-workflows)
8. [Competitor comparison](#competitor-comparison)
9. [Roadmap](#roadmap)
10. [Contributing](#contributing)
11. [License & Contact](#license--contact)

---

## What is Mocktail‑CLI?

Mocktail-CLI is a Prisma-aware CLI tool for generating realistic mock data based on your database schema. It supports nested relations, circular relation handling, deterministic seeds, schema auto-detection, and multiple output formats. Perfect for building, testing, and prototyping without waiting on backend data.

---

## Key features

* **Schema auto-detection** — automatically finds and validates schema.prisma.
* **Advanced relation presets** — generate realistic domain graphs (blog, ecommerce, social).
* **Schema-aware generation** — matches Prisma model types and relations.
* **Relation handling** — supports deep and circular relations with controlled `--depth`.
* **Deterministic seeds** — reproducible datasets with `--seed` and `--seed-value`.
* **Multiple output formats** — JSON, SQL, CSV, TypeScript.
* **Custom generators** — define per-model faker rules in `mocktail-cli.config.js`.
* **CLI-first** — quick commands for generate, seed, and export.

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

### Generate mock data from a Prisma schema

```bash
npx mocktail-cli generate \
  --schema ./prisma/schema.prisma \
  --models User,Post \
  --count 50 \
  --out ./mocks/data.json \
  --format json \
  --seed
```

* `--depth 2` — set how deep nested relations go.
* `--out` — output to a file or stdout.
* `--preset blog` — generate domain-specific data.

---

## CLI reference (examples)

```
# Generate 20 Users
mocktail-cli generate --models User --count 20

# Generate Users and Posts with specific counts
mocktail-cli generate --models User,Post --count 10,30 --out ./mocks

# Generate SQL inserts instead of JSON
mocktail-cli generate --format sql --out ./seeds

# Use a preset for ecommerce data
mocktail-cli generate --preset ecommerce --count 100

#Full option list

Option                      	Alias             	Description
-c, --count <number>	                          	Number of records per model (default: 5)
-o, --out <directory>		                          Output directory
-f, --format <type>		                            Output format: json, sql, ts, csv (default: json)
-s, --schema <path>		                            Prisma schema path (default: ./prisma/schema.prisma, auto-detect enabled)
-m, --models <models>	                          	Comma-separated list of models (optional)
--mock-config <path>	                           	Path to mocktail-cli.config.js
-d, --depth <number>	                    	      Nested relation depth (default: 1)
--seed	                                        	Insert generated data into DB
--seed-value <number>		                          Seed value for reproducible data generation
--preset <type>	                                	Relation preset: blog, ecommerce, social
--force-logo		                                  Force show the logo animation even if shown before
-h, --help		                                    Display help with usage and examples

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

## Example workflows

### Frontend prototyping

1. Generate realistic data: `mocktail-cli generate --count 50`
2. Feed the output to your mock API server.

### Testing with consistent seeds

1. Generate with seed: `mocktail-cli generate --seed --seed-value 42` 
2. Run tests with consistent fixtures.

### Domain-specific seeding

`mocktail-cli generate --preset social --count 100 --seed`

---

##  Competitor Comparison

How **Mocktail-CLI** compares with other schema-aware mock data tools:

| Feature / Tool                  | **Mocktail-CLI** | Prisma-Seed | Prisma-Generator-Fake | Mockoon / MirageJS |
|---------------------------------|------------------|-------------|------------------------|--------------------|
| Schema-aware (reads Prisma)     | ✅ Yes           | ✅ Yes      | ✅ Yes                 | ❌ No              |
| Auto-detect Prisma schema       | ✅ Yes           | ❌ No       | ❌ No                  | ❌ No              |
| Circular relation handling      | ✅ Yes           | ⚠️ Partial  | ❌ No                  | ❌ No              |
| Seed value reproducibility      | ✅ Yes           | ⚠️ Limited  | ❌ No                  | ❌ No              |
| Output formats (JSON, SQL, CSV) | ✅ Yes           | ❌ No       | ❌ No                  | ⚠️ JSON only       |
| Relation presets (blog, etc.)   | ✅ Yes           | ❌ No       | ❌ No                  | ❌ No              |
| CLI-first workflow              | ✅ Yes           | ⚠️ Partial  | ❌ No (generator only) | ❌ No (server only) |
| Extensible config (mocktail-cli.config.js) | ✅ Yes | ❌ No | ❌ No | ❌ No |
| Actively maintained             | ✅ Yes           | ❌ No       | ❌ No                  | ⚠️ Varies          |

✅ = Full support | ⚠️ = Partial / limited | ❌ = Not supported

Takeaway:
* Mocktail-CLI is the only Prisma-native, CLI-first tool that:
  * Auto-detects your schema
  * Generates deep relation-safe mock data
  * Supports reproducible seeds
  * Offers multiple output formats & realistic presets

## Roadmap

* v1.0: CLI complete with flags for depth, output formats, custom config.
* v1.1: ✅ Schema auto-detection, advanced relation presets (blog, ecommerce, social).
* v1.2+: Integration with Mock-Verse for API mocking, seeding, and team workflows.

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

