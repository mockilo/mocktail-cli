# Mocktail-CLI

**Note:** `.env` file was sanitized in this package release. Use `.env.example` to set `DATABASE_URL` before running anything that needs a DB.


![npm version](https://img.shields.io/npm/v/mocktail-cli.svg)
![License](https://img.shields.io/npm/l/mocktail-cli)
![Downloads](https://img.shields.io/npm/dt/mocktail-cli)


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

* `--depth 2` — set how deep nested relations go (depth > 1 enables relations).
* `--relations` — enable automatic relation generation (works with any depth).
* `--out` — output to a file or stdout.
* `--preset blog` — generate domain-specific data.

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

| Option | Alias | Description |
|--------|-------|-------------|
| `-c, --count <number>` | | Number of records per model (default: 5) |
| `-o, --out <directory>` | | Output directory |
| `-f, --format <type>` | | Output format: json, sql, ts, csv (default: json) |
| `-s, --schema <path>` | | Prisma schema path (default: ./prisma/schema.prisma, auto-detect enabled) |
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

---

##  Competitor Comparison

How **Mocktail-CLI** compares with other schema-aware mock data tools:

| Feature / Tool                              | **Mocktail-CLI** | Prisma-Seed | Prisma-Generator-Fake | Mockoon / MirageJS | faker-js |
|---------------------------------------------|-----------------|-------------|----------------------|------------------|----------|
| Prisma schema aware (reads schema)          | ✅ Yes          | ✅ Yes      | ✅ Yes               | ❌ No             | ❌ No    |
| Auto-detect Prisma schema                   | ✅ Yes          | ❌ No       | ❌ No                | ❌ No             | ❌ No    |
| Handles relations (deep / circular-safe)    | ✅ Deep + safe  | ⚠️ Limited | ⚠️ Limited           | ❌ Manual         | ❌ No    |
| Deterministic seeds                         | ✅ `--seed-value`| ⚠️ Partial | ⚠️ Partial           | ❌ No             | ✅*      |
| Output formats                              | ✅ JSON / SQL / CSV / TS | ❌ Mostly JSON | ❌ Mostly JSON | ✅ JSON / API   | ⚠️ Code-driven only |
| CLI-first workflow                           | ✅ Yes          | ⚠️ Partial | ⚠️ Plugin-only       | ✅ Yes (server)   | ❌ No    |
| Relation presets (blog / ecommerce / social)| ✅ Built-in     | ❌ No       | ❌ No                | ❌ No             | ❌ No    |
| DB seeding                                  | ✅ Yes          | ❌ No       | ❌ No                | ❌ No             | ❌ No    |
| Extensible config                            | ✅ `mocktail-cli.config.js` | ⚠️ Partial | ⚠️ Partial     | ⚠️ Partial       | ⚠️ Manual only |

\* `faker-js` supports `faker.seed(...)` for deterministic values, but it is **not schema-aware** and **doesn’t handle relations automatically**.  

❤️ Mocktail-CLI uses `@faker-js/faker` internally for realistic field data — every record feels lifelike.

Takeaway:
* Mocktail-CLI is the only Prisma-native, CLI-first tool that:
  * Auto-detects your schema
  * Generates deep relation-safe mock data
  * Supports reproducible seeds
  * Offers multiple output formats & realistic presets

## Roadmap

* v1.0: ✅ CLI complete with flags for depth, output formats, custom config.
* v1.1: ✅ Schema auto-detection, advanced relation presets (blog, ecommerce, social).
* v1.2: Schema-aware meaning all schema(for now we have done Prisma)
* v1.3+: Integration with Mockilo for API mocking, seeding, and team workflows.

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

