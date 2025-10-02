#!/usr/bin/env npx tsx
//

import { Command } from "commander";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import ora from "ora";
import chalk from "chalk";
import { spawn } from "child_process";
import { faker } from '@faker-js/faker';
import { writeMockDataToFile } from "../src/utils/writeMockDataToFile";
import { generateMockData } from "../src/generators/generateMockData";
import { SchemaRegistry } from "../src/schema-parsers/schemaRegistry";
import { errorHandler } from "../src/utils/errorHandler";
import { performanceOptimizer } from "../src/utils/performanceOptimizer";
import { pluginManager } from "../src/plugins/pluginManager";
import { outputFormatter } from "../src/utils/outputFormatter";
import { circularDependencyResolver } from "../src/utils/circularDependencyResolver";
// Logo
import printMocktailLogo from '../src/printMocktailLogo';

// Read version from package.json
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
const version = packageJson.version;

import type {
  Model,
  ModelsMap,
  GeneratedData,
  RelationPresets,
  MockConfig,
  SeedData,
  SchemaValidation,
  GenerateCommandOptions,
  GlobalOptions,
  SpawnOptions,
  ChildProcess,
  OraSpinner
} from '../src/types';

// let formatToSQL: ((value: any, options?: { sqlMode?: boolean }) => string) | null = null;
// let formatJoinTableSQL: ((modelName: string, records: Array<{ A: string; B: string }>) => string) | null = null;

// try {
//   const sqlFmt = require("../src/utils/formatToSQL");
//   formatToSQL = sqlFmt.formatToSQL;
//   formatJoinTableSQL = sqlFmt.formatJoinTableSQL;
// } catch {}

let loadMockConfig: ((path: string) => MockConfig) | null = null;
try {
  loadMockConfig = require("../src/utils/loadMockConfig").default;
} catch {}

const SEEN_FILE = path.join(os.homedir(), ".mocktail-cli-seen");

function loadEnvFile(envPath: string): void {
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

async function shouldShowLogo(forceLogo: boolean, noLogo: boolean, noSubcommand: boolean): Promise<boolean> {
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
  .description("Schema-aware mock data generator")
  .version(version)
  .option('--no-logo', 'Suppress logo output globally')
  .option('-q, --quiet', 'Suppress output except errors globally')
  .option('--force-logo', 'Force show the logo animation even if shown before')
  .option('--enable-plugins', 'Enable plugin system')
  .option('--plugin-dir <path>', 'Directory to load plugins from')
  .option('--performance-mode', 'Enable performance optimizations for large datasets')
  .option('--memory-limit <mb>', 'Set memory limit in MB', '1024')
  .option('--batch-size <size>', 'Set batch size for processing', '1000')
  .option('--enable-advanced-relations', 'Enable advanced relation detection')
  .option('--relation-confidence <threshold>', 'Set relation detection confidence threshold', '0.5')
  .option('--verbose', 'Enable verbose output with detailed information')
  .option('--timestamp', 'Add timestamps to output');


// Initialize schema registry lazily
let schemaRegistry: SchemaRegistry | null = null;

function getSchemaRegistry(): SchemaRegistry {
  if (!schemaRegistry) {
    schemaRegistry = new SchemaRegistry();
  }
  return schemaRegistry;
}

// Enhanced schema detection functions
function findSchemas(basePath: string = process.cwd()): string[] {
  return getSchemaRegistry().getDetector().findSchemaFiles(basePath);
}

// Process a single schema file
async function processSingleSchema(schemaPath: string, schemaType: string, opts: GenerateCommandOptions, _globalOpts: GlobalOptions): Promise<void> {
  const resolvedPath = path.resolve(process.cwd(), schemaPath);
  
  // Validate schema
  const schemaValidation = await validateSchema(resolvedPath, schemaType);
  if (!schemaValidation.valid) {
    throw new Error(`Invalid schema: ${schemaValidation.errors.join(', ')}`);
  }
  
  // Parse schema
  const models: ModelsMap = await getSchemaRegistry().parseSchema(resolvedPath, schemaType);
  
  if (Object.keys(models).length === 0) {
    throw new Error('No models found in schema');
  }
  
  // Filter models if specified
  let filteredModels = models;
  if (opts.models) {
    const modelNames = opts.models.split(',').map(name => name.trim());
    filteredModels = Object.fromEntries(
      Object.entries(models).filter(([name]) => modelNames.includes(name))
    );
  }
  
  // Generate output path
  const outputPath = opts.out ? path.join(opts.out, path.basename(schemaPath, path.extname(schemaPath))) : undefined;
  
  // Run generation - using the existing generate command logic
  const { runGenerate } = await import('../src/commands/generate');
  await runGenerate({
    schema: resolvedPath,
    count: parseInt(opts.count, 10),
    seed: opts.seed || false,
    output: outputPath || '',
    models: filteredModels,
    format: opts.format,
    depth: parseInt(opts.depth, 10),
    nest: opts.nest || false,
    relations: opts.relations || false,
    dedupe: opts.dedupe || false,
    pretty: opts.pretty || false,
    noLog: opts.noLog || false,
    seedValue: opts.seedValue || undefined,
    preset: opts.preset || undefined
  });
}

async function validateSchema(schemaPath: string, schemaType?: string): Promise<SchemaValidation> {
  return await getSchemaRegistry().validateSchema(schemaPath, schemaType);
}

function autoDetectSchema(): { path: string; type: string } | null {
  const schemas = findSchemas();
  
  if (schemas.length === 0) {
    return null;
  }
  
  // Validate all found schemas
  const validSchemas: Array<{ path: string; type: string; validation: SchemaValidation }> = [];
  
  for (const schemaPath of schemas) {
    const detectedType = getSchemaRegistry().getDetector().detectSchemaType(schemaPath);
    if (detectedType) {
      // Note: This is a synchronous check for auto-detection
      // In a real implementation, you might want to make this async
      const parser = getSchemaRegistry().getParser(detectedType);
      if (parser) {
        try {
          const validation = parser.validateSchema(schemaPath);
          if (validation.valid) {
            validSchemas.push({ path: schemaPath, type: detectedType, validation });
          }
        } catch (err) {
          // Skip invalid schemas
        }
      }
    }
  }
  
  if (validSchemas.length === 0) {
    console.warn('⚠️ Found schema files but none are valid:');
    schemas.forEach(schema => {
      const detectedType = getSchemaRegistry().getDetector().detectSchemaType(schema);
      if (detectedType) {
        const parser = getSchemaRegistry().getParser(detectedType);
        if (parser) {
          try {
            const validation = parser.validateSchema(schema);
            if (!validation.valid) {
              console.warn(`  ${schema} (${detectedType}): ${validation.errors.join(', ')}`);
            }
          } catch (err) {
            console.warn(`  ${schema} (${detectedType}): Invalid schema`);
          }
        }
      }
    });
    return null;
  }
  
  // Prefer Prisma schema in default location
  const defaultPrismaSchema = validSchemas.find(s => 
    s.type === 'prisma' && s.path.includes('/prisma/schema.prisma')
  );
  if (defaultPrismaSchema) {
    return { path: defaultPrismaSchema.path, type: defaultPrismaSchema.type };
  }
  
  // Return the first valid schema
  const firstValid = validSchemas[0];
  if (firstValid) {
    return { path: firstValid.path, type: firstValid.type };
  }
  
  return null;
}

// Advanced relation presets
const relationPresets: RelationPresets = {
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
// function generateCustomRelations(model: Model, preset: string, relationData: Record<string, any>): Record<string, any> {
//   const presetConfig = relationPresets[preset as keyof RelationPresets];
//   if (!presetConfig || !presetConfig[model.name]) {
//     return relationData;
//   }
//   
//   const customData = { ...relationData };
//   const modelConfig = presetConfig[model.name];
//   
//   for (const [relationName, config] of Object.entries(modelConfig || {})) {
//     if (config.count) {
//       // Generate custom count for this relation
//       const count = faker.number.int(config.count);
//       // Apply custom logic here
//     }
//   }
//   
//   return customData;
// }

// GENERATE command
const generateCommand = program
  .command("generate")
  .description("Generate mock data for any schema (Prisma, GraphQL, JSON Schema, OpenAPI)")
  .option("-c, --count <number>", "Number of records per model", "5")
  .option("-o, --out <directory>", "Output directory")
  .option("-f, --format <type>", "Output format: json, sql, ts, csv", "json")
  .option("-s, --schema <path>", "Schema path (auto-detected if not specified)", "./prisma/schema.prisma")
  .option("-t, --type <type>", "Schema type: prisma, graphql, json-schema, openapi, typescript, protobuf, avro, xml-schema, sql-ddl, mongoose, sequelize, joi, yup, zod (auto-detected if not specified)")
  .option("--batch", "Process multiple schema files in the current directory")
  .option("-m, --models <models>", "Comma-separated list of models (optional)")
  .option("--mock-config <path>", "Path to mocktail-cli.config.js")
  .option("-d, --depth <number>", "Nested relation depth (depth > 1 enables relations)", "1")
  .option("--no-nest", "Disable nested relations (flat structure)")
  .option("--relations", "Enable automatic relation generation (works with any depth)")
  .option("--dedupe", "Enable deduplication of records")
  .option("--pretty", "Pretty-print JSON output")
  .option("--no-pretty", "Disable pretty-printing JSON output")
  .option("--no-log", "Suppress console logs during mock generation")
  .option("--seed", "Insert mock data into DB")
  .option("--seed-value <number>", "Seed value for reproducible data generation")
  .option("--preset <type>", "Relation preset: blog, ecommerce, social");

generateCommand.action(async (opts: GenerateCommandOptions) => {
    const spinner: OraSpinner = ora({ spinner: "dots" });
    try {
      const globalOpts: GlobalOptions = program.opts();
      
      // Initialize enhanced features
      if ((globalOpts as any).enablePlugins) {
        if ((globalOpts as any).pluginDir) {
          await pluginManager.loadPluginsFromDirectory((globalOpts as any).pluginDir);
        } else {
          // Load default plugins
          const defaultPluginDir = path.join(__dirname, '../src/plugins/examples');
          if (fs.existsSync(defaultPluginDir)) {
            await pluginManager.loadPluginsFromDirectory(defaultPluginDir);
          }
        }
        outputFormatter.success('Plugin system enabled');
        outputFormatter.info(pluginManager.getPluginInfo());
      }

      // Initialize performance optimizer
      if ((globalOpts as any).performanceMode) {
        performanceOptimizer.startGeneration();
        outputFormatter.success('Performance mode enabled');
      }

      // Batch processing
      if (opts.batch) {
        const schemas = findSchemas();
        if (schemas.length === 0) {
          console.error(chalk.red('❌ No schema files found for batch processing'));
          process.exit(1);
        }
        
        console.log(chalk.blue(`🔄 Processing ${schemas.length} schema files...`));
        
        for (const schemaPath of schemas) {
          const detectedType = getSchemaRegistry().getDetector().detectSchemaType(schemaPath);
          if (detectedType) {
            console.log(chalk.gray(`\n📄 Processing: ${schemaPath} (${detectedType})`));
            try {
              await processSingleSchema(schemaPath, detectedType, opts, globalOpts);
            } catch (error: any) {
              console.error(chalk.red(`❌ Failed to process ${schemaPath}: ${error.message}`));
            }
          }
        }
        return;
      }

      // Enhanced schema detection and validation
      let schemaPath: string = opts.schema;
      let schemaType: string | undefined = opts.type;

      // Auto-detect schema if not specified or if default doesn't exist
      if (!opts.schema || opts.schema === './prisma/schema.prisma') {
        const detectedSchema = autoDetectSchema();
        if (detectedSchema) {
          schemaPath = detectedSchema.path;
          schemaType = detectedSchema.type;
          if (!globalOpts.quiet) console.log(`🔍 Auto-detected schema: ${schemaPath} (${schemaType})`);
        }
      }

      schemaPath = path.resolve(process.cwd(), schemaPath);

      // Enhanced schema validation
      const schemaValidation = await validateSchema(schemaPath, schemaType);
      if (!schemaValidation.valid) {
        console.error(`❌ Invalid ${schemaType || 'schema'}: ${schemaPath}`);
        console.error(`Errors: ${schemaValidation.errors.join(', ')}`);
        console.error(chalk.yellow('💡 Supported schema types:'));
        console.error(chalk.gray('  - prisma, graphql, json-schema, openapi'));
        console.error(chalk.gray('  - typescript, protobuf, avro, xml-schema'));
        console.error(chalk.gray('  - sql-ddl, mongoose, sequelize'));
        console.error(chalk.gray('  - joi, yup, zod'));
        process.exit(1);
      }

      if (!fs.existsSync(schemaPath)) {
        console.error(`❌ Schema file not found: ${schemaPath}`);
        
        // Try to help user find schemas
        const schemas = findSchemas();
        if (schemas.length > 0) {
          console.log('\n Found these schema files:');
          schemas.forEach(s => {
            const detectedType = getSchemaRegistry().getDetector().detectSchemaType(s);
            console.log(`  ${s} (${detectedType || 'unknown'})`);
          });
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

      const mockConfig: MockConfig | null = loadMockConfig && opts.mockConfig
        ? loadMockConfig(opts.mockConfig)
        : null;

      const modelsObject: ModelsMap = await getSchemaRegistry().parseSchema(schemaPath, schemaType);
      const allModels: Model[] = Object.values(modelsObject);

      let filteredModels: Model[] = allModels;
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

      if (!globalOpts.quiet && !opts.noLog) spinner.start("Preparing generation order and state...");
      const generatedDataMap: Record<string, Record<string, any>[]> = {};
      // Order models so that those without required inbound relations are seeded first
      const modelNameToModel: Record<string, Model> = Object.fromEntries(allModels.map(m => [m.name, m]));
      function hasRequiredInboundRelations(m: Model): boolean {
        for (const field of m.fields) {
          // If this field is a required foreign key to another model, this model depends on others
          if (field.relationFromFields && field.relationFromFields.length > 0) {
            // If FK field is optional, we can seed without the parent existing
            if (!field.isOptional) return true;
          }
        }
        return false;
      }
      function topologicalOrder(models: Model[]): Model[] {
        const incoming = new Map<string, number>();
        const dependsOn = new Map<string, Set<string>>();
        for (const m of models) {
          const deps = new Set<string>();
          for (const f of m.fields) {
            if (f.relationFromFields && f.relationFromFields.length > 0) {
              // This model references f.type
              deps.add(f.type);
            }
          }
          dependsOn.set(m.name, deps);
          incoming.set(m.name, deps.size);
        }
        const queue: string[] = [];
        for (const m of models) {
          if (!hasRequiredInboundRelations(m)) queue.push(m.name);
        }
        const ordered: Model[] = [];
        const visited = new Set<string>();
        while (queue.length) {
          const name = queue.shift();
          if (!name || visited.has(name)) continue;
          visited.add(name);
          const model = modelNameToModel[name];
          if (model) ordered.push(model);
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

      // Use advanced circular dependency resolution
      if (!globalOpts.quiet && !opts.noLog) spinner.start("Analyzing dependencies and resolving cycles...");
      
      const dependencyResult = circularDependencyResolver.resolveDependencies(filteredModels);
      const seedingOrder: Model[] = dependencyResult.generationOrder;
      
      if (dependencyResult.cycles.length > 0) {
        if (!globalOpts.quiet && !opts.noLog) {
          console.log(`\n🔄 Detected ${dependencyResult.cycles.length} circular dependencies:`);
          dependencyResult.cycles.forEach(cycle => {
            console.log(`  • ${cycle.type} cycle: ${cycle.nodes.join(' → ')} (${cycle.strength})`);
          });
          
          if (dependencyResult.resolutionPlan) {
            console.log(`\n🛠️  Applied resolution strategy: ${dependencyResult.resolutionPlan.strategy}`);
            if (dependencyResult.resolutionPlan.deferredRelations.length > 0) {
              console.log(`  • Deferred ${dependencyResult.resolutionPlan.deferredRelations.length} relations for later population`);
            }
          }
        }
      }
      
      if (!globalOpts.quiet && !opts.noLog) spinner.succeed("Dependencies analyzed and cycles resolved.");

      const seedDataByModel: Record<string, Record<string, any>[]> = {};
      if (!globalOpts.quiet && !opts.noLog) spinner.succeed("Order prepared. Starting data generation...");

      // First pass: generate all models without relations
      for (const model of seedingOrder) {
        if (!globalOpts.quiet && !opts.noLog) spinner.start(`📦 Generating data for model: ${model.name}`);

        const config = mockConfig?.[model.name];
        // Generate raw records without relations first
        const rawGen: GeneratedData = generateMockData(model, { 
          count, 
          relationData: {}, 
          config: { ...config, sqlMode: false },
          preset: opts.preset || null
        });
        const rawRecords: Record<string, any>[] = rawGen.records;
        // Store raw records so downstream relations use plain values (not SQL-safe strings)
        generatedDataMap[model.name] = rawRecords;

        // File writing will be done after relations are populated

        if (opts.seed) {
          const scalarFieldNames = new Set(model.fields.filter(f => f.isScalar || f.isId).map(f => f.name));
          const cleanRecords = rawRecords.map(rec => {
            const out: Record<string, any> = {};
            for (const key of Object.keys(rec)) {
              if (scalarFieldNames.has(key)) out[key] = rec[key];
            }
            return out;
          });
          seedDataByModel[model.name] = cleanRecords;
        }

        if (!globalOpts.quiet && !opts.noLog) spinner.succeed(`Finished processing model: ${model.name}`);
      }

      // Second pass: populate relations based on depth (unless --no-nest is specified)
      // Generate relations if --relations flag is passed OR if depth > 1
      // Commander maps --no-nest to opts.nest === false
      const shouldGenerateRelations = (opts.relations || depth > 1) && opts.nest !== false;
      if (shouldGenerateRelations) {
        if (!globalOpts.quiet && !opts.noLog) spinner.start("🔗 Populating relations...");
        
        // If --relations is used alone (depth=1), use depth=2 for meaningful nesting
        const effectiveDepth = opts.relations && depth === 1 ? 2 : depth;
        
        const buildRelationData = (currentModel: Model, currentDepth: number, visited: Set<string> = new Set()): Record<string, any> => {
          if (currentDepth > effectiveDepth) return {};
          if (visited.has(currentModel.name)) return {};
          visited.add(currentModel.name);

          const relationData: Record<string, any> = {};
          for (const field of currentModel.fields) {
            if (field.isRelation) {
              const relatedModelName = field.type;
              const relatedModel = allModels.find(m => m.name === relatedModelName);
              if (relatedModel && generatedDataMap[relatedModelName]) {
                // Only include relations if we haven't exceeded effective depth
                if (currentDepth < effectiveDepth) {
                  const relatedRecords = generatedDataMap[relatedModelName] || [];
                  
                  if (field.isArray) {
                    // For array relations, create nested objects with preset count
                    let recordsToUse = relatedRecords;
                    
                    // Apply preset count if specified
                    if (opts.preset && relationPresets[opts.preset as keyof RelationPresets] && relationPresets[opts.preset as keyof RelationPresets][currentModel.name]) {
                      const presetConfig = relationPresets[opts.preset as keyof RelationPresets]?.[currentModel.name]?.[field.name];
                      if (presetConfig && presetConfig.count) {
                        const maxCount = Math.min(relatedRecords.length, presetConfig.count.max);
                        const minCount = presetConfig.count.min;
                        const count = Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount;
                        recordsToUse = relatedRecords.slice(0, count);
                        if (!globalOpts.quiet && !opts.noLog) {
                          console.log(`🎯 Preset ${opts.preset}: ${currentModel.name}.${field.name} = ${count} records (min: ${minCount}, max: ${maxCount})`);
                        }
                      }
                    }
                    
                    relationData[field.name] = recordsToUse.map(record => {
                      const nestedRecord = { ...record };
                      // Recursively add nested relations
                      const nestedData = buildRelationData(relatedModel, currentDepth + 1, new Set(visited));
                      Object.assign(nestedRecord, nestedData);
                      return nestedRecord;
                    });
                  } else {
                    // For single relations, pick one record and nest it
                    const selectedRecord = relatedRecords[Math.floor(Math.random() * relatedRecords.length)] || null;
                    if (selectedRecord) {
                      const nestedRecord = { ...selectedRecord };
                      const nestedData = buildRelationData(relatedModel, currentDepth + 1, new Set(visited));
                      Object.assign(nestedRecord, nestedData);
                      relationData[field.name] = nestedRecord;
                    } else {
                      relationData[field.name] = null;
                    }
                  }
                } else {
                  // At max depth, just include empty arrays/null
                  relationData[field.name] = field.isArray ? [] : null;
                }
              }
            }
          }
          return relationData;
        };

        // Regenerate data with relations for each model
        for (const model of seedingOrder) {
          const relationData = buildRelationData(model, 1);
          const config = mockConfig?.[model.name];
          
          if (Object.keys(relationData).length > 0) {
            if (!globalOpts.quiet && !opts.noLog) console.log(`🔗 Adding relations to ${model.name}:`, Object.keys(relationData));
            
            // Regenerate with relations
            const rawGen: GeneratedData = generateMockData(model, { 
              count, 
              relationData, 
              config: { ...config, sqlMode: false },
              preset: opts.preset || null
            });
            generatedDataMap[model.name] = rawGen.records;
          }
        }

        // Generic nested relation handling for any schema (only if effective depth > 1 and not --no-nest)
        if (effectiveDepth > 1 && opts.nest !== false) {
          // Handle one-to-many relationships (posts, comments, etc.)
          if (generatedDataMap['Post'] && generatedDataMap['User']) {
          const posts = generatedDataMap['Post'];
          const users = generatedDataMap['User'];
          
          if (!globalOpts.quiet && !opts.noLog) console.log(`🔗 Processing ${posts.length} posts`);
          
          // Update posts to reference actual User IDs and fix field conflicts
          generatedDataMap['Post'] = posts.map((post, index) => {
            const user = users[index % users.length];
            return {
              ...post,
              authorId: user?.['id'],  // Use authorId for posts (matches schema)
              userId: undefined,  // Remove conflicting userId field
              author: { id: user?.['id'], name: user?.['name'], email: user?.['email'] },
              user: undefined     // Remove conflicting user field
            };
          });
          
          // Update User posts with nested post objects
          generatedDataMap['User'] = users.map(user => {
            const userPosts = generatedDataMap['Post']?.filter(p => p['authorId'] === user['id']) || [];
            
            // Apply preset count for posts if specified
            let postsToUse = userPosts;
            if (opts.preset && relationPresets[opts.preset as keyof RelationPresets] && relationPresets[opts.preset as keyof RelationPresets]['User'] && relationPresets[opts.preset as keyof RelationPresets]['User']?.['posts']) {
              const presetConfig = relationPresets[opts.preset as keyof RelationPresets]['User']?.['posts'];
              if (presetConfig?.count) {
                const maxCount = Math.min(userPosts.length, presetConfig.count.max);
                const minCount = presetConfig.count.min;
                const count = Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount;
                postsToUse = userPosts.slice(0, count);
                if (!globalOpts.quiet && !opts.noLog) {
                  console.log(`🎯 Preset ${opts.preset}: User.posts = ${count} records (min: ${minCount}, max: ${maxCount})`);
                }
              }
            }
            
            return {
              ...user,
              posts: postsToUse.map(post => ({
                id: post['id'],
                title: post['title'],
                content: post['content'],
                authorId: post['authorId'],
              author: post['author'],
              comments: post['comments']
              }))
            };
          });
        }
        
          // Handle comments
          if (generatedDataMap['Comment'] && generatedDataMap['User'] && generatedDataMap['Post']) {
          const comments = generatedDataMap['Comment'];
          const users = generatedDataMap['User'];
          const posts = generatedDataMap['Post'];
          
          if (!globalOpts.quiet && !opts.noLog) console.log(`🔗 Processing ${comments.length} comments`);
          
          // Update comments to reference actual User and Post IDs
          generatedDataMap['Comment'] = comments.map((comment, index) => {
            const user = users[index % users.length];
            const post = posts[index % posts.length];
            return {
              ...comment,
              authorId: user?.['id'],
              postId: post?.['id'],
              author: { id: user?.['id'], name: user?.['name'], email: user?.['email'] },
              post: { id: post?.['id'], title: post?.['title'] }
            };
          });
          
          // Update User comments with nested comment objects
          generatedDataMap['User'] = generatedDataMap['User'].map(user => {
            const userComments = generatedDataMap['Comment']?.filter(c => c['authorId'] === user['id']) || [];
            
            // Apply preset count for comments if specified
            let commentsToUse = userComments;
            if (opts.preset && relationPresets[opts.preset as keyof RelationPresets] && relationPresets[opts.preset as keyof RelationPresets]['User'] && relationPresets[opts.preset as keyof RelationPresets]['User']?.['comments']) {
              const presetConfig = relationPresets[opts.preset as keyof RelationPresets]['User']?.['comments'];
              if (presetConfig?.count) {
                const maxCount = Math.min(userComments.length, presetConfig.count.max);
                const minCount = presetConfig.count.min;
                const count = Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount;
                commentsToUse = userComments.slice(0, count);
                if (!globalOpts.quiet && !opts.noLog) {
                  console.log(`🎯 Preset ${opts.preset}: User.comments = ${count} records (min: ${minCount}, max: ${maxCount})`);
                }
              }
            }
            
            return {
              ...user,
              comments: commentsToUse
            };
          });
          
          // Update Post comments with nested comment objects
          generatedDataMap['Post'] = generatedDataMap['Post'].map(post => {
            const postComments = generatedDataMap['Comment']?.filter(c => c['postId'] === post['id']) || [];
            return {
              ...post,
              comments: postComments
            };
          });
        }
        
          // Handle many-to-many relationships (User-Team)
          if (generatedDataMap['Team'] && generatedDataMap['User']) {
          const teams = generatedDataMap['Team'];
          const users = generatedDataMap['User'];
          
          if (!globalOpts.quiet && !opts.noLog) console.log(`🔗 Processing User-Team relationships`);
          
          // Create user-team associations
          const userTeamAssociations: Array<{ userId: any; teamId: any }> = [];
          users.forEach((user) => {
            // Each user can be in 0-2 teams
            const teamCount = Math.floor(Math.random() * 3);
            for (let i = 0; i < teamCount; i++) {
              const team = teams[i % teams.length];
              userTeamAssociations.push({ userId: user['id'], teamId: team?.['id'] });
            }
          });
          
          // Update User teams with nested team objects
          generatedDataMap['User'] = users.map(user => {
            const userTeamIds = userTeamAssociations.filter(a => a.userId === user['id']).map(a => a.teamId);
            const userTeams = teams.filter(team => userTeamIds.includes(team['id']));
            return {
              ...user,
              teams: userTeams
            };
          });
          
          // Update Team users with nested user objects
          generatedDataMap['Team'] = teams.map(team => {
            const teamUserIds = userTeamAssociations.filter(a => a.teamId === team['id']).map(a => a.userId);
            const teamUsers = users.filter(user => teamUserIds.includes(user['id']));
            return {
              ...team,
              users: teamUsers.map(user => ({
                id: user['id'],
                name: user['name'],
                email: user['email']
              }))
            };
          });
          }
        }
        
        if (!globalOpts.quiet && !opts.noLog) spinner.succeed("Relations populated.");
      }

      // Show final console output if no output directory specified
      if (!outputDir) {
        for (const model of seedingOrder) {
        if (!globalOpts.quiet && !opts.noLog) {
          console.log(`\n📦 Final data for model: ${model.name}`);
          console.dir(generatedDataMap[model.name], { depth: null });
        }
        }
      }

      // Apply deduplication if --dedupe flag is set
      if (opts.dedupe) {
        if (!globalOpts.quiet && !opts.noLog) spinner.start("🔄 Deduplicating records...");
        
        for (const model of seedingOrder) {
          const records = generatedDataMap[model.name];
          if (records && records.length > 0) {
            // Simple deduplication based on ID field
            const seen = new Set();
            const dedupedRecords = records.filter(record => {
              const id = record['id'];
              if (seen.has(id)) {
                return false;
              }
              seen.add(id);
              return true;
            });
            generatedDataMap[model.name] = dedupedRecords;
          }
        }
        
        if (!globalOpts.quiet && !opts.noLog) spinner.succeed("Records deduplicated.");
      }

      // Write files with final data (including relations)
      if (outputDir) {
        for (const model of seedingOrder) {
          const finalRecords = generatedDataMap[model.name];
          if (finalRecords && finalRecords.length > 0) {
            // Handle pretty printing: default is true, unless --no-pretty is specified
            const shouldPretty = opts.pretty !== false && !opts.noPretty;
            const written = writeMockDataToFile(model.name, finalRecords, outputDir, opts.format, shouldPretty);
            if (!globalOpts.quiet && !opts.noLog) console.log(`✅ Saved data for ${model.name} → ${written}`);
          }
        }
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
          if (!globalOpts.quiet && !opts.noLog) console.log(`🎲 Using seed value: ${seedValue}`);
        }

        // Write seed JSON into the Prisma project
        const prismaProject = path.resolve(path.dirname(schemaPath), "..");
        const seedFile = path.join(prismaProject, "__mocktail_seed.json");
        const payload: SeedData = {
          order: seedingOrder.map(m => m.name),
          data: seedDataByModel,
        };
        fs.writeFileSync(seedFile, JSON.stringify(payload, null, 2), "utf8");
        if (!globalOpts.quiet && !opts.noLog) console.log(`\n✅ Mock data JSON saved to: ${seedFile}`);

        // Ensure Prisma Client is generated in the target project
        const run = (cmd: string, args: string[], cwd: string): Promise<number> => new Promise((resolve) => {
          const child: ChildProcess = spawn(cmd, args, { cwd, stdio: 'inherit', shell: true } as SpawnOptions);
          child.on('exit', (code: number) => resolve(code));
        });

        if (!globalOpts.quiet && !opts.noLog) console.log("\n🧩 Generating Prisma Client in target project...");
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

        if (!globalOpts.quiet && !opts.noLog) console.log("\n🌱 Spawning seeding process in Prisma project...");
        const seedCode = await run('node', [runnerPath], prismaProject);
        try { fs.unlinkSync(runnerPath); } catch {}
        if (seedCode === 0) {
          if (!globalOpts.quiet && !opts.noLog) console.log('🌱 Seeding complete!');
          if (!globalOpts.quiet && !opts.noLog) console.log("\n✅ Mock data generation completed.");
          process.exit(0);
        } else {
          console.error('❌ Seeding failed!');
          process.exit(1);
        }
      } else {
        if (!globalOpts.quiet && !opts.noLog) console.log("\n✅ Mock data generation completed.");
        process.exit(0);
      }

    } catch (error: any) {
      spinner.fail("Failed!");
      
      // Enhanced error handling
      const enhancedError = errorHandler.createEnhancedError(
        error,
        error.code || 'GENERATION_ERROR',
        {
          command: 'generate',
          schemaPath: opts.schema,
          schemaType: opts.type || 'unknown'
        }
      );
      
      errorHandler.logError(enhancedError);
      
      // Stop performance monitoring
      if ((program.opts() as any).performanceMode) {
        performanceOptimizer.stopGeneration();
        console.log(performanceOptimizer.getPerformanceReport());
      }
      
      process.exit(1);
    }
  });


// Show README content in terminal
const docsCommand = program
  .command("docs")
  .description("Show full README.md documentation in terminal");

docsCommand.action(() => {
    const readmePath = path.resolve(__dirname, "../../README.md");
    if (!fs.existsSync(readmePath)) {
      console.error("❌ README.md file not found.");
      process.exit(1);
    }
    const readmeContent = fs.readFileSync(readmePath, "utf-8");
    console.log(readmeContent);
  });

// Plugin management commands
const pluginsCommand = program
  .command("plugins")
  .description("Manage plugins");

pluginsCommand
  .command("list")
  .description("List all loaded plugins")
  .action(() => {
    console.log(pluginManager.getPluginInfo());
  });

pluginsCommand
  .command("enable <name>")
  .description("Enable a plugin")
  .action((name: string) => {
    pluginManager.enablePlugin(name);
    console.log(`✅ Plugin ${name} enabled`);
  });

pluginsCommand
  .command("disable <name>")
  .description("Disable a plugin")
  .action((name: string) => {
    pluginManager.disablePlugin(name);
    console.log(`❌ Plugin ${name} disabled`);
  });

pluginsCommand
  .command("load <path>")
  .description("Load a plugin from file or directory")
  .action(async (pluginPath: string) => {
    try {
      if (fs.statSync(pluginPath).isDirectory()) {
        await pluginManager.loadPluginsFromDirectory(pluginPath);
      } else {
        await pluginManager.loadPlugin(pluginPath);
      }
      console.log(`✅ Plugin(s) loaded from ${pluginPath}`);
    } catch (error: any) {
      console.error(`❌ Failed to load plugin: ${error.message}`);
      process.exit(1);
    }
  });

// Performance monitoring command
const performanceCommand = program
  .command("performance")
  .description("Performance monitoring and optimization");

performanceCommand
  .command("status")
  .description("Show current performance metrics")
  .action(() => {
    console.log(performanceOptimizer.getPerformanceReport());
  });

performanceCommand
  .command("optimize")
  .description("Optimize settings for current system")
  .action(() => {
    const memoryUsage = performanceOptimizer.getMemoryUsage();
    const recommendedBatchSize = performanceOptimizer.calculateOptimalBatchSize(10000);
    
    console.log(`
🔧 Performance Optimization Recommendations:
  💾 Current Memory Usage: ${memoryUsage.used.toFixed(2)}MB (${memoryUsage.percentage.toFixed(1)}%)
  📦 Recommended Batch Size: ${recommendedBatchSize}
  ⚡ Performance Mode: ${performanceOptimizer.getMetrics().totalBatches > 0 ? 'Active' : 'Inactive'}
  
💡 Suggested CLI options:
  --performance-mode --batch-size ${recommendedBatchSize} --memory-limit ${Math.max(1024, Math.round(memoryUsage.total * 0.8))}
    `);
  });

// Enhanced relation detection command
const relationsCommand = program
  .command("relations")
  .description("Analyze and detect relations in schemas");

relationsCommand
  .command("analyze <schema>")
  .description("Analyze relations in a schema file")
  .option("-t, --type <type>", "Schema type (auto-detected if not specified)")
  .option("-c, --confidence <threshold>", "Confidence threshold (0-1)", "0.5")
  .action(async (schemaPath: string, opts: any) => {
    try {
      const { RelationDetector } = await import('../src/relations/relationDetector');
      const { SchemaRegistry } = await import('../src/schema-parsers/schemaRegistry');
      
      const schemaRegistry = new SchemaRegistry();
      const models = await schemaRegistry.parseSchema(schemaPath, opts.type);
      
      const detector = new RelationDetector({
        confidenceThreshold: parseFloat(opts.confidence)
      });
      
      const relations = detector.detectRelations(models);
      const averageConfidence = relations.reduce((sum, r) => sum + r.confidence, 0) / relations.length;
      
      console.log(`
🔗 Relation Analysis Results:
  📄 Schema: ${schemaPath}
  🔍 Relations Found: ${relations.length}
  📊 Average Confidence: ${(averageConfidence * 100).toFixed(1)}%
  
📋 Detected Relations:
${relations.map(r => 
  `  ${r.from} → ${r.to} (${r.field}) [${r.type}] - ${(r.confidence * 100).toFixed(1)}% confidence`
).join('\n')}
      `);
    } catch (error: any) {
      console.error(`❌ Failed to analyze relations: ${error.message}`);
      process.exit(1);
    }
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

  // Custom colorful main help output
  program.helpInformation = function (): string {
    return `
${chalk.hex('#00d8c9').bold('Usage:')} ${chalk.greenBright('mocktail-cli')} ${chalk.yellow('[options]')} ${chalk.yellow('[command]')}

${chalk.cyan('Schema-aware mock data generator')}

${chalk.magenta('Options:')}
  ${chalk.green('-V, --version')}       ${chalk.gray('output the version number')}
  ${chalk.green('--no-logo')}           ${chalk.gray('Suppress logo output globally')}
  ${chalk.green('-q, --quiet')}         ${chalk.gray('Suppress output except errors globally')}
  ${chalk.green('--force-logo')}        ${chalk.gray('Force show the logo animation even if shown before')}
  ${chalk.green('-h, --help')}          ${chalk.gray('display help for command')}

${chalk.magenta('Commands:')}
  ${chalk.yellow('generate [options]')}  ${chalk.gray('Generate mock data for any schema (Prisma, GraphQL, JSON Schema, OpenAPI)')}
  ${chalk.yellow('plugins [command]')}   ${chalk.gray('Manage plugins (list, enable, disable, load)')}
  ${chalk.yellow('performance [cmd]')}   ${chalk.gray('Performance monitoring and optimization')}
  ${chalk.yellow('relations [cmd]')}     ${chalk.gray('Analyze and detect relations in schemas')}
  ${chalk.yellow('docs')}                ${chalk.gray('Show full README.md documentation in terminal')}
  ${chalk.yellow('help [command]')}      ${chalk.gray('display help for command')}

${chalk.cyan('For detailed documentation, run:')}
  ${chalk.green('mocktail-cli docs')}
${chalk.cyan('Or visit')} ${chalk.underline.blue('https://github.com/mockilo/mocktail-cli')}
`;
  };

  // Override generate command help with colorful custom output
  const generateCmd = program.commands.find(cmd => cmd.name() === "generate");
  if (generateCmd) {
    generateCmd.helpInformation = function (): string {
      return `
${chalk.hex('#00d8c9').bold('Usage:')} ${chalk.greenBright('mocktail-cli generate')} ${chalk.yellow('[options]')}

${chalk.cyan('Generate mock data for any schema (Prisma, GraphQL, JSON Schema, OpenAPI)')}

${chalk.magenta('Options:')}
  ${chalk.green('-c, --count <number>')}   ${chalk.gray(`Number of records per model (default: "5")`)}
  ${chalk.green('-o, --out <directory>')}  ${chalk.gray('Output directory')}
  ${chalk.green('-f, --format <type>')}    ${chalk.gray(`Output format: json, sql, ts, csv (default: "json")`)}
  ${chalk.green('-s, --schema <path>')}    ${chalk.gray(`Schema path (default: "./prisma/schema.prisma")`)}
  ${chalk.green('-t, --type <type>')}      ${chalk.gray(`Schema type: prisma, graphql, json-schema, openapi, typescript, protobuf, avro, xml-schema, sql-ddl, mongoose, sequelize, joi, yup, zod (auto-detected if not specified)`)}
  ${chalk.green('-m, --models <models>')}  ${chalk.gray('Comma-separated list of models (optional)')}
  ${chalk.green('--mock-config <path>')}   ${chalk.gray('Path to mocktail-cli.config.js')}
  ${chalk.green('-d, --depth <number>')}   ${chalk.gray(`Nested relation depth - depth > 1 enables relations (default: "1")`)}
  ${chalk.green('--no-nest')}              ${chalk.gray('Disable nested relations (flat structure)')}
  ${chalk.green('--relations')}            ${chalk.gray('Enable automatic relation generation (works with any depth)')}
  ${chalk.green('--dedupe')}               ${chalk.gray('Enable deduplication of records')}
  ${chalk.green('--pretty')}               ${chalk.gray('Pretty-print JSON output (default: true)')}
  ${chalk.green('--no-log')}               ${chalk.gray('Suppress console logs during mock generation')}
  ${chalk.green('--seed')}                 ${chalk.gray('Insert mock data into DB')}
  ${chalk.green('--seed-value <number>')}  ${chalk.gray('Seed value for reproducible data generation')}
  ${chalk.green('--preset <type>')}        ${chalk.gray('Relation preset: blog, ecommerce, social')}
  ${chalk.green('--force-logo')}           ${chalk.gray('Force show the logo animation even if shown before')}
  ${chalk.green('-h, --help')}             ${chalk.gray('display help for command')}
`;
    };
  }

  // Now parse commands normally, command actions will NOT print logo again
  program.parse(process.argv);
})();
