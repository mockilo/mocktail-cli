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
8. [Roadmap](#roadmap)
9. [Contributing](#contributing)
10. [License & Contact](#license--contact)

---

## What is Mocktail‑CLI?

Mocktail‑CLI is a Prisma‑aware CLI tool for generating realistic mock data based on your database schema. It supports nested relations, circular relation handling, deterministic seeds, and multiple output formats, helping you build and test without waiting on backend data.

---

## Key features

* **Schema‑aware generation** — reads your Prisma schema and generates data that matches model types and relations.
* **Relation handling** — supports deep and circular relations with controlled depth.
* **Deterministic seeds** — generate the same dataset every time with `--seed` and `--seed-value`.
* **Multiple output formats** — JSON, SQL INSERT scripts, CSV.
* **Custom generators** — define per‑model faker rules in `mock.config.js`.
* **CLI‑first** — quick commands for generate, seed, and export.

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
  --output ./mocks/data.json \
  --seed
```

* `--depth 2` — set how deep nested relations go.
* `--output` — output to a file or stdout.

---

## CLI reference (examples)

```
# Generate 20 Users
mocktail-cli generate --schema ./prisma/schema.prisma --models User --count 20

# Generate Users and Posts with specific counts
mocktail-cli generate --schema ./prisma/schema.prisma --models User,Post --count 10,30 --output mocks.json

# Generate SQL inserts instead of JSON
mocktail-cli generate --schema ./prisma/schema.prisma --format sql --output seed.sql
```

---

## Configuration

Define a `mock.config.js` or `mock.config.json` to customize generation.

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

1. Generate realistic data: `mocktail-cli generate --schema ./schema.prisma --count 50`
2. Feed the output to your mock API server.

### Testing with consistent seeds

1. Generate with seed: `mocktail-cli generate --seed --seed-value 42`
2. Run tests with consistent fixtures.

---

## Roadmap

* v1.0: CLI complete with flags for depth, output formats, custom config.
* v1.1: Schema auto‑detection, advanced relation presets.
* v1.2+: Integration with Mock‑Verse for API mocking and seeding.

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

