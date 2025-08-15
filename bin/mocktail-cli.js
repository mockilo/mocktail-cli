#!/usr/bin/env node
//

const { Command } = require("commander");
const path = require("path");
const fs = require("fs");
const os = require("os");
const ora = require("ora").default;
const chalk = require("chalk");
const { spawn } = require("child_process");
const { faker } = require('@faker-js/faker');
const { writeMockDataToFile } = require("../src/utils/writeMockDataToFile");
const { parsePrismaSchema } = require("../src/schema-parsers/prismaParser");
const { generateMockData } = require("../src/generators/generateMockData");
// Logo
const printMocktailLogo = require('../src/printMocktailLogo');

let formatToSQL = null;
let formatJoinTableSQL = null;
try {
  const sqlFmt = require("../src/utils/formatToSQL");
  formatToSQL = sqlFmt.formatToSQL;
  formatJoinTableSQL = sqlFmt.formatJoinTableSQL;
} catch {}

let loadMockConfig = null;
try {
  loadMockConfig = require("../src/utils/loadMockConfig").default;
} catch {}

const SEEN_FILE = path.join(os.homedir(), ".mocktail-cli-seen");

function loadEnvFile(envPath) {
  try {
    if (!fs.existsSync(envPath)) return;
    const contents = fs.readFileSync(envPath, 'utf8');
    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      let value = trimmed.slice(idx + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {}
}

async function shouldShowLogo(forceLogo, noLogo, noSubcommand) {
  if (noLogo) return false;
  if (forceLogo) return true;
  if (!noSubcommand) return false;

  try {
    if (fs.existsSync(SEEN_FILE)) {
      return false; // Already seen, don't show again
    } else {
      fs.writeFileSync(SEEN_FILE, "seen", { encoding: "utf-8" });
      return true; // Show logo first time and create seen file
    }
  } catch {
    return true; // On error, show logo once
  }
}

const program = new Command();

program
  .name("mocktail-cli")
  .description("Prisma-aware mock data generator")
  .version("1.1.0")
  .option('--no-logo', 'Suppress logo output globally')
  .option('-q, --quiet', 'Suppress output except errors globally')
  .option('--force-logo', 'Force show the logo animation even if shown before');

// Custom colorful main help output
program.helpInformation = function () {
  return `
${chalk.hex('#00d8c9').bold('Usage:')} ${chalk.greenBright('mocktail-cli')} ${chalk.yellow('[options]')} ${chalk.yellow('[command]')}

${chalk.cyan('Prisma-aware mock data generator')}

${chalk.magenta('Options:')}
  ${chalk.green('-V, --version')}       ${chalk.gray('output the version number')}
  ${chalk.green('--no-logo')}           ${chalk.gray('Suppress logo output globally')}
  ${chalk.green('-q, --quiet')}         ${chalk.gray('Suppress output except errors globally')}
  ${chalk.green('--force-logo')}        ${chalk.gray('Force show the logo animation even if shown before')}
  ${chalk.green('-h, --help')}          ${chalk.gray('display help for command')}

${chalk.magenta('Commands:')}
  ${chalk.yellow('generate [options]')}  ${chalk.gray('Generate mock data for a Prisma schema')}
  ${chalk.yellow('docs')}                ${chalk.gray('Show full README.md documentation in terminal')}
  ${chalk.yellow('help [command]')}      ${chalk.gray('display help for command')}

${chalk.cyan('For detailed documentation, run:')}
  ${chalk.green('mocktail-cli docs')}
${chalk.cyan('Or visit')} ${chalk.underline.blue('https://github.com/mock-verse/mocktail-cli')}
`;
};

// Enhanced schema detection functions
function findPrismaSchemas(basePath = process.cwd()) {
  const schemas = [];
  
  function scanDirectory(dir) {
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
          scanDirectory(fullPath);
        } else if (file === 'schema.prisma') {
          schemas.push(fullPath);
        }
      }
    } catch (err) {
      // Skip directories we can't read
    }
  }
  
  scanDirectory(basePath);
  return schemas;
}

function validatePrismaSchema(schemaPath) {
  try {
    const content = fs.readFileSync(schemaPath, 'utf8');
    
    // Basic validation checks
    const hasDataSource = /datasource\s+db\s*\{/.test(content);
    const hasGenerator = /generator\s+client\s*\{/.test(content);
    const hasModels = /model\s+\w+\s*\{/.test(content);
    
    const errors = [];
    if (!hasDataSource) errors.push('Missing datasource block');
    if (!hasGenerator) errors.push('Missing generator block');
    if (!hasModels) errors.push('No models found');
    
    return {
      valid: errors.length === 0,
      errors,
      path: schemaPath
    };
  } catch (err) {
    return {
      valid: false,
      errors: [`Cannot read schema file: ${err.message}`],
      path: schemaPath
    };
  }
}

function autoDetectSchema() {
  const schemas = findPrismaSchemas();
  
  if (schemas.length === 0) {
    return null;
  }
  
  // Validate all found schemas
  const validSchemas = schemas.map(validatePrismaSchema).filter(s => s.valid);
  
  if (validSchemas.length === 0) {
    console.warn('⚠️ Found Prisma schemas but none are valid:');
    schemas.forEach(schema => {
      const validation = validatePrismaSchema(schema);
      if (!validation.valid) {
        console.warn(`  ${schema}: ${validation.errors.join(', ')}`);
      }
    });
    return null;
  }
  
  // Prefer the default location
  const defaultSchema = validSchemas.find(s => s.path.includes('/prisma/schema.prisma'));
  if (defaultSchema) {
    return defaultSchema.path;
  }
  
  // Return the first valid schema
  return validSchemas[0].path;
}

// Advanced relation presets
const relationPresets = {
  // Blog/Content Management
  blog: {
    User: {
      posts: { count: { min: 1, max: 5 } },
      comments: { count: { min: 0, max: 10 } }
    },
    Post: {
      comments: { count: { min: 0, max: 15 } },
      categories: { count: { min: 1, max: 3 } }
    }
  },
  
  // E-commerce
  ecommerce: {
    User: {
      orders: { count: { min: 0, max: 8 } },
      reviews: { count: { min: 0, max: 5 } }
    },
    Product: {
      reviews: { count: { min: 0, max: 20 } },
      categories: { count: { min: 1, max: 2 } }
    }
  },
  
  // Social Network
  social: {
    User: {
      posts: { count: { min: 0, max: 10 } },
      followers: { count: { min: 0, max: 50 } },
      following: { count: { min: 0, max: 50 } }
    }
  }
};

// Custom relation generator
function generateCustomRelations(model, preset, relationData) {
  const presetConfig = relationPresets[preset];
  if (!presetConfig || !presetConfig[model.name]) {
    return relationData;
  }
  
  const customData = { ...relationData };
  const modelConfig = presetConfig[model.name];
  
  for (const [relationName, config] of Object.entries(modelConfig)) {
    if (config.count) {
      // Generate custom count for this relation
      const count = faker.number.int(config.count);
      // Apply custom logic here
    }
  }
  
  return customData;
}

// GENERATE command
program
  .command("generate")
  .description("Generate mock data for a Prisma schema")
  .option("-c, --count <number>", "Number of records per model", "5")
  .option("-o, --out <directory>", "Output directory")
  .option("-f, --format <type>", "Output format: json, sql, ts, csv", "json")
  .option("-s, --schema <path>", "Prisma schema path (auto-detected if not specified)", "./prisma/schema.prisma")
  .option("-m, --models <models>", "Comma-separated list of models (optional)")
  .option("--mock-config <path>", "Path to mocktail-cli.config.js")
  .option("-d, --depth <number>", "Nested relation depth", "1")
  .option("--seed", "Insert mock data into DB")
  .option("--seed-value <number>", "Seed value for reproducible data generation")
  .option("--preset <type>", "Relation preset: blog, ecommerce, social")
  .action(async (opts) => {
    const spinner = ora({ spinner: "dots" });
    try {
      const globalOpts = program.opts();
      // NO LOGO here anymore!

      // Replace the current schema handling with enhanced auto-detection
      let schemaPath = opts.schema;

      // Auto-detect schema if not specified or if default doesn't exist
      if (!opts.schema || opts.schema === './prisma/schema.prisma') {
        const detectedSchema = autoDetectSchema();
        if (detectedSchema) {
          schemaPath = detectedSchema;
          if (!globalOpts.quiet) console.log(`🔍 Auto-detected schema: ${schemaPath}`);
        }
      }

      schemaPath = path.resolve(process.cwd(), schemaPath);

      // Enhanced schema validation
      const schemaValidation = validatePrismaSchema(schemaPath);
      if (!schemaValidation.valid) {
        console.error(`❌ Invalid Prisma schema: ${schemaPath}`);
        console.error(`Errors: ${schemaValidation.errors.join(', ')}`);
        process.exit(1);
      }

      if (!fs.existsSync(schemaPath)) {
        console.error(`❌ Schema file not found: ${schemaPath}`);
        
        // Try to help user find schemas
        const schemas = findPrismaSchemas();
        if (schemas.length > 0) {
          console.log('\n Found these Prisma schemas:');
          schemas.forEach(s => console.log(`  ${s}`));
          console.log('\n💡 Try using one of these paths with --schema');
        }
        process.exit(1);
      }

      // Load .env from the Prisma project root if present, without extra deps
      const envPath = path.join(path.dirname(schemaPath), '..', '.env');
      loadEnvFile(envPath);

      const count = parseInt(opts.count, 10);
      const depth = parseInt(opts.depth, 10);
      if (isNaN(count) || count <= 0) {
        console.error("❌ --count must be a positive integer.");
        process.exit(1);
      }
      if (isNaN(depth) || depth <= 0) {
        console.error("❌ --depth must be a positive integer.");
        process.exit(1);
      }

      const supportedFormats = ["json", "csv", "ts", "sql"];
      if (!supportedFormats.includes(opts.format)) {
        console.error(`❌ Unsupported format: ${opts.format}`);
        console.error(`Supported formats: ${supportedFormats.join(", ")}`);
        process.exit(1);
      }

      const mockConfig = loadMockConfig && opts.mockConfig
        ? loadMockConfig(opts.mockConfig)
        : null;

      const modelsObject = parsePrismaSchema(schemaPath);
      const allModels = Object.values(modelsObject);

      let filteredModels = allModels;
      if (opts.models) {
        const allowed = opts.models.split(",").map(m => m.trim());
        filteredModels = allModels.filter(m => allowed.includes(m.name));
      }

      if (filteredModels.length === 0) {
        console.error("❌ No models found after filtering.");
        process.exit(1);
      }

      const outputDir = opts.out ? path.resolve(process.cwd(), opts.out) : null;
      if (outputDir && !fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      if (!globalOpts.quiet) spinner.start("Preparing generation order and state...");
      const generatedDataMap = {};
      // Order models so that those without required inbound relations are seeded first
      const modelNameToModel = Object.fromEntries(allModels.map(m => [m.name, m]));
      function hasRequiredInboundRelations(m) {
        for (const field of m.fields) {
          // If this field is a required foreign key to another model, this model depends on others
          if (field.relationFromFields && field.relationFromFields.length > 0) {
            // If FK field is optional, we can seed without the parent existing
            if (!field.isOptional) return true;
          }
        }
        return false;
      }
      function topologicalOrder(models) {
        const incoming = new Map();
        const dependsOn = new Map();
        for (const m of models) {
          const deps = new Set();
          for (const f of m.fields) {
            if (f.relationFromFields && f.relationFromFields.length > 0) {
              // This model references f.type
              deps.add(f.type);
            }
          }
          dependsOn.set(m.name, deps);
          incoming.set(m.name, deps.size);
        }
        const queue = [];
        for (const m of models) {
          if (!hasRequiredInboundRelations(m)) queue.push(m.name);
        }
        const ordered = [];
        const visited = new Set();
        while (queue.length) {
          const name = queue.shift();
          if (visited.has(name)) continue;
          visited.add(name);
          ordered.push(modelNameToModel[name]);
          for (const [n, deps] of dependsOn) {
            if (deps.has(name)) {
              deps.delete(name);
              incoming.set(n, deps.size);
              if (deps.size === 0) queue.push(n);
            }
          }
        }
        for (const m of models) {
          if (!visited.has(m.name)) ordered.push(m);
        }
        return ordered;
      }

      const seedingOrder = topologicalOrder(filteredModels);

      const seedDataByModel = {};
      if (!globalOpts.quiet) spinner.succeed("Order prepared. Starting data generation...");

      for (const model of seedingOrder) {
        if (!globalOpts.quiet) spinner.start(`📦 Generating data for model: ${model.name}`);

        const buildRelationData = (currentModel, currentDepth, visited = new Set()) => {
          if (currentDepth > depth) return {};
          if (visited.has(currentModel.name)) return {};
          visited.add(currentModel.name);

          const relationData = {};
          for (const field of currentModel.fields) {
            if (field.isRelation) {
              const relatedModelName = field.type;
              const relatedModel = allModels.find(m => m.name === relatedModelName);
              if (relatedModel) {
                relationData[field.name] = generatedDataMap[relatedModelName] || [];
                Object.assign(
                  relationData[field.name],
                  buildRelationData(relatedModel, currentDepth + 1, new Set(visited))
                );
              }
            }
          }
          return relationData;
        };

        const relationData = buildRelationData(model, 1);
        const config = mockConfig?.[model.name];
        const isSqlOutput = opts.format === 'sql';

        // Always generate raw records for seeding and relation resolution
        const rawGen = generateMockData(model, { 
          count, 
          relationData, 
          config: { ...config, sqlMode: false },
          preset: opts.preset 
        });
        const rawRecords = rawGen.records;
        // Store raw records so downstream relations use plain values (not SQL-safe strings)
        generatedDataMap[model.name] = rawRecords;

        if (outputDir) {
          if (isSqlOutput) {
            // Generate SQL-safe values for file output
            const sqlGen = generateMockData(model, { 
              count, 
              relationData, 
              config: { ...config, sqlMode: true },
              preset: opts.preset 
            });
            const sqlRecords = sqlGen.records;
            const written = writeMockDataToFile(model.name, sqlRecords, outputDir, opts.format, formatToSQL);
            if (!globalOpts.quiet) console.log(`✅ Saved data for ${model.name} → ${written}`);
            if (sqlGen.joinTableRecords && formatJoinTableSQL) {
              for (const [joinTableName, joinRows] of Object.entries(sqlGen.joinTableRecords)) {
                if (!Array.isArray(joinRows) || joinRows.length === 0) continue;
                const joinSql = formatJoinTableSQL(joinTableName, joinRows);
                const joinPath = path.join(outputDir, `${joinTableName}.sql`);
                fs.writeFileSync(joinPath, joinSql, 'utf8');
                if (!globalOpts.quiet) console.log(`  ↳ Wrote join table inserts → ${joinPath}`);
              }
            }
          } else {
            const written = writeMockDataToFile(model.name, rawRecords, outputDir, opts.format, formatToSQL);
            if (!globalOpts.quiet) console.log(`✅ Saved data for ${model.name} → ${written}`);
          }
        } else {
          if (!globalOpts.quiet) console.dir(rawRecords, { depth: null });
        }

        if (opts.seed) {
          const scalarFieldNames = new Set(model.fields.filter(f => f.isScalar || f.isId).map(f => f.name));
          const cleanRecords = rawRecords.map(rec => {
            const out = {};
            for (const key of Object.keys(rec)) {
              if (scalarFieldNames.has(key)) out[key] = rec[key];
            }
            return out;
          });
          seedDataByModel[model.name] = cleanRecords;
        }

        if (!globalOpts.quiet) spinner.succeed(`Finished processing model: ${model.name}`);
      }

      if (opts.seed) {
        // Set faker seed if provided
        if (opts.seedValue) {
          const seedValue = parseInt(opts.seedValue, 10);
          if (isNaN(seedValue)) {
            console.error("❌ --seed-value must be a valid integer.");
            process.exit(1);
          }
          faker.seed(seedValue);
          if (!globalOpts.quiet) console.log(`🎲 Using seed value: ${seedValue}`);
        }

        // Write seed JSON into the Prisma project
        const prismaProject = path.resolve(path.dirname(schemaPath), "..");
        const seedFile = path.join(prismaProject, "__mocktail_seed.json");
        const payload = {
          order: seedingOrder.map(m => m.name),
          data: seedDataByModel,
        };
        fs.writeFileSync(seedFile, JSON.stringify(payload, null, 2), "utf8");
        if (!globalOpts.quiet) console.log(`\n✅ Mock data JSON saved to: ${seedFile}`);

        // Ensure Prisma Client is generated in the target project
        const run = (cmd, args, cwd) => new Promise((resolve) => {
          const child = spawn(cmd, args, { cwd, stdio: 'inherit', shell: true });
          child.on('exit', (code) => resolve(code));
        });

        if (!globalOpts.quiet) console.log("\n🧩 Generating Prisma Client in target project...");
        const genCode = await run('npx', ['--yes', 'prisma', 'generate'], prismaProject);
        if (genCode !== 0) {
          console.error('❌ Failed to generate Prisma Client in target project.');
          process.exit(1);
        }

        // Create a temporary seed runner inside the target project to ensure correct module resolution
        const runnerPath = path.join(prismaProject, '.mocktail_seed_runner.cjs');
        const runnerSrc = [
          "const fs = require('fs');",
          "const path = require('path');",
          "const seedFile = path.join(process.cwd(), '__mocktail_seed.json');",
          "if (!fs.existsSync(seedFile)) { console.error('❌ Mock data JSON not found. Run the CLI first.'); process.exit(1); }",
          "const payload = JSON.parse(fs.readFileSync(seedFile, 'utf8'));",
          "const order = Array.isArray(payload.order) ? payload.order : Object.keys(payload.data);",
          "const data = payload.data || {};",
          "const { PrismaClient } = require('@prisma/client');",
          "const prisma = new PrismaClient();",
          "(async () => {",
          "  try {",
          "    for (const modelName of order) {",
          "      const modelKey = modelName.charAt(0).toLowerCase() + modelName.slice(1);",
          "      if (typeof prisma[modelKey]?.createMany === 'function') {",
          "        await prisma[modelKey].createMany({ data: data[modelName], skipDuplicates: true });",
          "        console.log(`✅ Seeded ${data[modelName].length} records into ${modelName}`);",
          "      } else {",
          "        console.warn(`⚠️ No createMany method found for model: ${modelName}`);",
          "      }",
          "    }",
          "    await prisma.$disconnect();",
          "  } catch (err) {",
          "    console.error('❌ Error during seeding:', err);",
          "    process.exit(1);",
          "  }",
          "})();",
          ''
        ].join('\n');
        fs.writeFileSync(runnerPath, runnerSrc, 'utf8');

        if (!globalOpts.quiet) console.log("\n🌱 Spawning seeding process in Prisma project...");
        const seedCode = await run('node', [runnerPath], prismaProject);
        try { fs.unlinkSync(runnerPath); } catch {}
        if (seedCode === 0) {
          if (!globalOpts.quiet) console.log('🌱 Seeding complete!');
          if (!globalOpts.quiet) console.log("\n✅ Mock data generation completed.");
          process.exit(0);
        } else {
          console.error('❌ Seeding failed!');
          process.exit(1);
        }
      } else {
        if (!globalOpts.quiet) console.log("\n✅ Mock data generation completed.");
        process.exit(0);
      }

    } catch (error) {
      spinner.fail("Failed!");
      console.error("❌ Error:", error.message || error);
      process.exit(1);
    }
  });

// Override generate command help with colorful custom output including --seed-value
const generateCmd = program.commands.find(cmd => cmd.name() === "generate");
generateCmd.helpInformation = function () {
  return `
${chalk.hex('#00d8c9').bold('Usage:')} ${chalk.greenBright('mocktail-cli generate')} ${chalk.yellow('[options]')}

${chalk.cyan('Generate mock data for a Prisma schema')}

${chalk.magenta('Options:')}
  ${chalk.green('-c, --count <number>')}   ${chalk.gray(`Number of records per model (default: "${this._optionValues.count || '5'}")`)}
  ${chalk.green('-o, --out <directory>')}  ${chalk.gray('Output directory')}
  ${chalk.green('-f, --format <type>')}    ${chalk.gray(`Output format: json, sql, ts, csv (default: "${this._optionValues.format || 'json'}")`)}
  ${chalk.green('-s, --schema <path>')}    ${chalk.gray(`Prisma schema path (default: "${this._optionValues.schema || './prisma/schema.prisma'}")`)}
  ${chalk.green('-m, --models <models>')}  ${chalk.gray('Comma-separated list of models (optional)')}
  ${chalk.green('--mock-config <path>')}   ${chalk.gray('Path to mocktail-cli.config.js')}
  ${chalk.green('-d, --depth <number>')}   ${chalk.gray(`Nested relation depth (default: "${this._optionValues.depth || '1'}")`)}
  ${chalk.green('--seed')}                 ${chalk.gray('Insert mock data into DB')}
  ${chalk.green('--seed-value <number>')}  ${chalk.gray('Seed value for reproducible data generation')}
  ${chalk.green('--preset <type>')}        ${chalk.gray('Relation preset: blog, ecommerce, social')}
  ${chalk.green('--force-logo')}           ${chalk.gray('Force show the logo animation even if shown before')}
  ${chalk.green('-h, --help')}             ${chalk.gray('display help for command')}
`;
};

// Show README content in terminal
program
  .command("docs")
  .description("Show full README.md documentation in terminal")
  .action(() => {
    const readmePath = path.resolve(__dirname, "../README.md");
    if (!fs.existsSync(readmePath)) {
      console.error("❌ README.md file not found.");
      process.exit(1);
    }
    const readmeContent = fs.readFileSync(readmePath, "utf-8");
    console.log(readmeContent);
  });

// === Here is the key fix: print logo ONLY here once, before parsing commands ===
(async () => {
  // Parse global options manually, since program.opts() isn't ready yet
  const args = process.argv.slice(2);

  const noLogo = args.includes('--no-logo') || args.includes('-q') || args.includes('--quiet');
  const forceLogo = args.includes('--force-logo');

  // Detect subcommand presence
  const knownCommands = ['generate', 'docs', 'help'];
  const firstArg = args[0];
  const isSubcommand = firstArg && knownCommands.includes(firstArg);

  // Show logo only if no subcommand is given (just running `mocktail-cli` alone)
  // OR if running help/version commands
  // OR if forced by --force-logo
  // Otherwise don't show logo
  const noSubcommand = !isSubcommand && (args.length === 0 || ['-h', '--help', '-V', '--version'].some(cmd => args.includes(cmd)));

  if (await shouldShowLogo(forceLogo, noLogo, noSubcommand)) {
    await printMocktailLogo();
  }

  // Now parse commands normally, command actions will NOT print logo again
  program.parse(process.argv);
})();
