# Troubleshooting Guide

Solutions to common issues and problems with Mocktail-CLI.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Schema Parsing Errors](#schema-parsing-errors)
- [Data Generation Problems](#data-generation-problems)
- [Performance Issues](#performance-issues)
- [Plugin Errors](#plugin-errors)
- [CLI Errors](#cli-errors)
- [Output Issues](#output-issues)

---

## Installation Issues

### Error: `command not found: mocktail`

**Problem:** The CLI command is not available after installation.

**Solutions:**

1. **Install globally:**
   ```bash
   npm install -g mocktail-cli
   ```

2. **Use npx:**
   ```bash
   npx mocktail-cli generate --schema schema.prisma
   ```

3. **Add to package.json scripts:**
   ```json
   {
     "scripts": {
       "generate": "mocktail generate --schema schema.prisma"
     }
   }
   ```

### Error: `Cannot find module 'mocktail-cli'`

**Problem:** Module not found when importing.

**Solutions:**

1. **Install as dependency:**
   ```bash
   npm install mocktail-cli
   ```

2. **Check import path:**
   ```typescript
   // ✅ Correct
   import { generateMockData } from 'mocktail-cli/src/generators/generateMockData';
   
   // ❌ Wrong
   import { generateMockData } from 'mocktail-cli';
   ```

### Permission Errors on Windows

**Problem:** `EACCES` or permission denied errors.

**Solutions:**

1. **Run as administrator**
2. **Fix npm permissions:**
   ```bash
   npm config set prefix ~\AppData\Roaming\npm
   ```

---

## Schema Parsing Errors

### Error: `Schema file not found`

**Problem:** Cannot locate the schema file.

**Solutions:**

1. **Check file path:**
   ```bash
   # Use absolute path
   mocktail generate --schema C:\path\to\schema.prisma
   
   # Or relative path from current directory
   mocktail generate --schema ./prisma/schema.prisma
   ```

2. **Verify file exists:**
   ```bash
   # Windows
   dir prisma\schema.prisma
   
   # Unix/Mac
   ls prisma/schema.prisma
   ```

### Error: `Invalid schema syntax`

**Problem:** Schema contains syntax errors.

**Solutions:**

1. **Validate Prisma schema:**
   ```bash
   npx prisma validate
   ```

2. **Check for common issues:**
   - Missing closing braces `}`
   - Invalid field types
   - Incorrect relation syntax
   - Missing `@@` for model-level attributes

3. **Use schema validator:**
   ```bash
   mocktail validate --schema schema.prisma
   ```

### Error: `Unsupported schema type`

**Problem:** Schema type not recognized.

**Solutions:**

1. **Specify schema type explicitly:**
   ```bash
   mocktail generate --schema schema.gql --type graphql
   ```

2. **Check supported types:**
   - prisma (.prisma)
   - graphql (.graphql, .gql)
   - json-schema (.json)
   - openapi (.yaml, .yml, .json)
   - typescript (.ts)

3. **Ensure correct file extension**

### Circular Dependency Issues

**Problem:** Models have circular references causing errors.

**Solutions:**

1. **Let Mocktail resolve automatically:**
   ```bash
   mocktail generate --schema schema.prisma --relations
   ```

2. **Use specific resolution strategy:**
   ```bash
   mocktail generate --schema schema.prisma --cycle-strategy lazy-loading
   ```

3. **Manually break cycles:**
   - Make some relations optional
   - Use `--no-relations` flag
   - Generate models in specific order

---

## Data Generation Problems

### Error: `generateField is not defined`

**Problem:** Missing or incorrect imports.

**Solutions:**

1. **Update to latest version:**
   ```bash
   npm update mocktail-cli
   ```

2. **Check imports in custom code:**
   ```typescript
   import { generateField } from 'mocktail-cli/src/generators/baseGenerators';
   ```

### Generated Data is Not Realistic

**Problem:** Data doesn't look realistic or contextual.

**Solutions:**

1. **Use custom field generators:**
   ```bash
   mocktail generate --config mocktail.config.js
   ```
   
   ```javascript
   // mocktail.config.js
   module.exports = {
     User: {
       email: (index) => `user${index}@company.com`,
       age: () => Math.floor(Math.random() * 50) + 18
     }
   };
   ```

2. **Use presets:**
   ```bash
   mocktail generate --preset blog  # or ecommerce, social
   ```

3. **Set locale:**
   ```bash
   mocktail generate --locale de  # German data
   ```

### Relations Not Generated

**Problem:** Related data is null or missing.

**Solutions:**

1. **Enable relations:**
   ```bash
   mocktail generate --relations --depth 2
   ```

2. **Check relation configuration:**
   - Ensure foreign key fields exist
   - Verify relation names match
   - Check for circular dependencies

3. **Generate in correct order:**
   ```bash
   # Generate parent model first
   mocktail generate --models User
   mocktail generate --models Post --relations
   ```

### Duplicate Values in Unique Fields

**Problem:** Unique constraints violated.

**Solutions:**

1. **Increase count limit:**
   ```bash
   # Don't generate more records than possible unique values
   mocktail generate --count 100  # Not 100,000
   ```

2. **Use custom unique generator:**
   ```javascript
   module.exports = {
     User: {
       email: (index) => `unique_${Date.now()}_${index}@test.com`
     }
   };
   ```

3. **Use UUIDs for IDs:**
   ```typescript
   import { v4 as uuidv4 } from 'uuid';
   
   config: {
     id: () => uuidv4()
   }
   ```

---

## Performance Issues

### Slow Generation for Large Datasets

**Problem:** Takes too long to generate many records.

**Solutions:**

1. **Enable performance mode:**
   ```bash
   mocktail generate --performance-mode --count 10000
   ```

2. **Use batch processing:**
   ```bash
   mocktail generate --batch --batch-size 1000
   ```

3. **Disable unnecessary features:**
   ```bash
   mocktail generate --no-relations --no-nest
   ```

4. **Optimize in code:**
   ```typescript
   // Generate in batches
   for (let i = 0; i < 100; i++) {
     const batch = generateMockData(model, { count: 1000 });
     await processBatch(batch);
   }
   ```

### Memory Errors

**Problem:** `FATAL ERROR: ... JavaScript heap out of memory`

**Solutions:**

1. **Increase Node.js memory:**
   ```bash
   set NODE_OPTIONS=--max-old-space-size=4096
   mocktail generate --count 100000
   ```

2. **Use streaming:**
   ```bash
   mocktail generate --stream --count 1000000
   ```

3. **Process in smaller batches:**
   ```bash
   # Generate 10 files of 10k records each
   for /l %i in (1,1,10) do (
     mocktail generate --count 10000 --out batch_%i
   )
   ```

---

## Plugin Errors

### Plugin Not Loading

**Problem:** Custom plugin fails to load.

**Solutions:**

1. **Check plugin path:**
   ```bash
   mocktail generate --plugins ./my-plugins
   ```

2. **Verify plugin structure:**
   ```typescript
   // plugin.ts must export default
   export default {
     name: 'my-plugin',
     version: '1.0.0',
     description: 'My plugin'
   };
   ```

3. **Check for errors:**
   ```typescript
   try {
     await pluginManager.loadPlugin('./plugin.ts');
   } catch (error) {
     console.error('Plugin error:', error);
   }
   ```

### Plugin Hook Not Executing

**Problem:** Lifecycle hooks don't run.

**Solutions:**

1. **Ensure plugin is enabled:**
   ```typescript
   pluginManager.enablePlugin('my-plugin');
   ```

2. **Check hook names:**
   ```typescript
   // ✅ Correct
   hooks: {
     beforeGeneration: async (context) => { /* ... */ }
   }
   
   // ❌ Wrong
   hooks: {
     beforeGenerate: async (context) => { /* ... */ }
   }
   ```

3. **Verify async/await:**
   ```typescript
   // If hook is async, use await
   hooks: {
     beforeGeneration: async (context) => {
       await someAsyncOperation();
     }
   }
   ```

---

## CLI Errors

### Error: `Unknown option`

**Problem:** Unrecognized CLI flag.

**Solutions:**

1. **Check available options:**
   ```bash
   mocktail generate --help
   ```

2. **Update to latest version:**
   ```bash
   npm update -g mocktail-cli
   ```

3. **Use correct syntax:**
   ```bash
   # ✅ Correct
   mocktail generate --count 100
   
   # ❌ Wrong
   mocktail generate -count 100
   ```

### TypeScript Errors in CLI

**Problem:** TypeScript compilation errors when running CLI.

**Solutions:**

1. **Use npx tsx:**
   ```bash
   npx tsx bin/mocktail-cli.ts generate --schema schema.prisma
   ```

2. **Compile TypeScript first:**
   ```bash
   npm run build
   node dist/bin/mocktail-cli.js generate --schema schema.prisma
   ```

3. **Install required dependencies:**
   ```bash
   npm install tsx @types/node --save-dev
   ```

---

## Output Issues

### Output Files Not Created

**Problem:** No files generated in output directory.

**Solutions:**

1. **Check output path:**
   ```bash
   # Use absolute path
   mocktail generate --out C:\output
   
   # Or create directory first
   mkdir output
   mocktail generate --out ./output
   ```

2. **Verify permissions:**
   - Ensure write access to output directory
   - Run as administrator if needed

3. **Check for errors:**
   ```bash
   mocktail generate --schema schema.prisma --out output --verbose
   ```

### Wrong Output Format

**Problem:** Generated files in unexpected format.

**Solutions:**

1. **Specify format explicitly:**
   ```bash
   mocktail generate --format json  # or sql, csv, ts
   ```

2. **Check format support:**
   - JSON: `.json`
   - SQL: `.sql`
   - CSV: `.csv`
   - TypeScript: `.ts`

### SQL Output Has Errors

**Problem:** Generated SQL doesn't run on database.

**Solutions:**

1. **Specify SQL dialect:**
   ```bash
   mocktail generate --format sql --sql-dialect postgres
   ```

2. **Fix string escaping:**
   ```javascript
   // In config
   config: {
     sqlMode: true,
     escapeStrings: true
   }
   ```

3. **Handle special characters:**
   ```javascript
   // Custom sanitizer
   name: (index) => `User ${index}`.replace(/'/g, "''")
   ```

---

## Common Error Messages

### `ENOENT: no such file or directory`

**Cause:** File path is incorrect or file doesn't exist.

**Fix:** Verify the file path and ensure it exists.

### `SyntaxError: Unexpected token`

**Cause:** Invalid JavaScript/TypeScript syntax in config or plugin.

**Fix:** Check syntax in your configuration or plugin files.

### `TypeError: Cannot read property 'X' of undefined`

**Cause:** Accessing property on undefined object.

**Fix:**
```typescript
// Add null checks
const value = object?.property ?? defaultValue;
```

### `Error: Maximum call stack size exceeded`

**Cause:** Infinite recursion, usually from circular dependencies.

**Fix:**
```bash
mocktail generate --cycle-strategy lazy-loading
```

---

## Debugging Tips

### Enable Verbose Logging

```bash
mocktail generate --verbose --schema schema.prisma
```

### Check Environment

```bash
node --version  # Should be >= 14
npm --version
npx tsx --version
```

### Test with Simple Schema

```prisma
// test.prisma
model User {
  id    String @id @default(uuid())
  name  String
}
```

```bash
mocktail generate --schema test.prisma --count 10
```

### Use Debug Mode

```typescript
process.env.DEBUG = 'mocktail:*';
```

### Check Generated Files

```bash
# View generated file
cat output/User.json

# Check file size
ls -lh output/User.json

# Validate JSON
node -e "JSON.parse(require('fs').readFileSync('output/User.json'))"
```

---

## Still Having Issues?

If none of the solutions above help:

1. **Search existing issues:** [GitHub Issues](https://github.com/mockilo/mocktail-cli/issues)
2. **Create a new issue:** Include:
   - Your environment (Node version, OS)
   - Complete error message
   - Minimal reproduction code
   - What you've tried already

3. **Ask for help:**
   - [GitHub Discussions](https://github.com/mockilo/mocktail-cli/discussions)
   - [Stack Overflow](https://stackoverflow.com/questions/tagged/mocktail-cli)

4. **Check documentation:**
   - [README](../README.md)
   - [API Documentation](./API.md)
   - [Plugin Development](./PLUGIN_DEVELOPMENT.md)

---

## Contributing

Found a solution not listed here? Please contribute by submitting a PR to update this guide!
