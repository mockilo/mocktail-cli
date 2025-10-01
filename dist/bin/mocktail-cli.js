#!/usr/bin/env node
"use strict";
//
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const ora_1 = __importDefault(require("ora"));
const chalk_1 = __importDefault(require("chalk"));
const child_process_1 = require("child_process");
const faker_1 = require("@faker-js/faker");
const writeMockDataToFile_1 = require("../src/utils/writeMockDataToFile");
const prismaParser_1 = require("../src/schema-parsers/prismaParser");
const generateMockData_1 = require("../src/generators/generateMockData");
// Logo
const printMocktailLogo_1 = __importDefault(require("../src/printMocktailLogo"));
// Read version from package.json
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8'));
const version = packageJson.version;
// let formatToSQL: ((value: any, options?: { sqlMode?: boolean }) => string) | null = null;
// let formatJoinTableSQL: ((modelName: string, records: Array<{ A: string; B: string }>) => string) | null = null;
// try {
//   const sqlFmt = require("../src/utils/formatToSQL");
//   formatToSQL = sqlFmt.formatToSQL;
//   formatJoinTableSQL = sqlFmt.formatJoinTableSQL;
// } catch {}
let loadMockConfig = null;
try {
    loadMockConfig = require("../src/utils/loadMockConfig").default;
}
catch { }
const SEEN_FILE = path.join(os.homedir(), ".mocktail-cli-seen");
function loadEnvFile(envPath) {
    try {
        if (!fs.existsSync(envPath))
            return;
        const contents = fs.readFileSync(envPath, 'utf8');
        for (const line of contents.split(/\r?\n/)) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#'))
                continue;
            const idx = trimmed.indexOf('=');
            if (idx === -1)
                continue;
            const key = trimmed.slice(0, idx).trim();
            let value = trimmed.slice(idx + 1).trim();
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            if (!(key in process.env))
                process.env[key] = value;
        }
    }
    catch { }
}
async function shouldShowLogo(forceLogo, noLogo, noSubcommand) {
    if (noLogo)
        return false;
    if (forceLogo)
        return true;
    if (!noSubcommand)
        return false;
    try {
        if (fs.existsSync(SEEN_FILE)) {
            return false; // Already seen, don't show again
        }
        else {
            fs.writeFileSync(SEEN_FILE, "seen", { encoding: "utf-8" });
            return true; // Show logo first time and create seen file
        }
    }
    catch {
        return true; // On error, show logo once
    }
}
const program = new commander_1.Command();
program
    .name("mocktail-cli")
    .description("Prisma-aware mock data generator")
    .version(version)
    .option('--no-logo', 'Suppress logo output globally')
    .option('-q, --quiet', 'Suppress output except errors globally')
    .option('--force-logo', 'Force show the logo animation even if shown before');
// Custom colorful main help output
program.helpInformation = function () {
    return `
${chalk_1.default.hex('#00d8c9').bold('Usage:')} ${chalk_1.default.greenBright('mocktail-cli')} ${chalk_1.default.yellow('[options]')} ${chalk_1.default.yellow('[command]')}

${chalk_1.default.cyan('Prisma-aware mock data generator')}

${chalk_1.default.magenta('Options:')}
  ${chalk_1.default.green('-V, --version')}       ${chalk_1.default.gray('output the version number')}
  ${chalk_1.default.green('--no-logo')}           ${chalk_1.default.gray('Suppress logo output globally')}
  ${chalk_1.default.green('-q, --quiet')}         ${chalk_1.default.gray('Suppress output except errors globally')}
  ${chalk_1.default.green('--force-logo')}        ${chalk_1.default.gray('Force show the logo animation even if shown before')}
  ${chalk_1.default.green('-h, --help')}          ${chalk_1.default.gray('display help for command')}

${chalk_1.default.magenta('Commands:')}
  ${chalk_1.default.yellow('generate [options]')}  ${chalk_1.default.gray('Generate mock data for a Prisma schema')}
  ${chalk_1.default.yellow('docs')}                ${chalk_1.default.gray('Show full README.md documentation in terminal')}
  ${chalk_1.default.yellow('help [command]')}      ${chalk_1.default.gray('display help for command')}

${chalk_1.default.cyan('For detailed documentation, run:')}
  ${chalk_1.default.green('mocktail-cli docs')}
${chalk_1.default.cyan('Or visit')} ${chalk_1.default.underline.blue('https://github.com/mockilo/mocktail-cli')}
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
                }
                else if (file === 'schema.prisma') {
                    schemas.push(fullPath);
                }
            }
        }
        catch (err) {
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
        if (!hasDataSource)
            errors.push('Missing datasource block');
        if (!hasGenerator)
            errors.push('Missing generator block');
        if (!hasModels)
            errors.push('No models found');
        return {
            valid: errors.length === 0,
            errors,
            path: schemaPath
        };
    }
    catch (err) {
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
    return validSchemas[0]?.path || '';
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
    .description("Generate mock data for a Prisma schema")
    .option("-c, --count <number>", "Number of records per model", "5")
    .option("-o, --out <directory>", "Output directory")
    .option("-f, --format <type>", "Output format: json, sql, ts, csv", "json")
    .option("-s, --schema <path>", "Prisma schema path (auto-detected if not specified)", "./prisma/schema.prisma")
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
generateCommand.action(async (opts) => {
    const spinner = (0, ora_1.default)({ spinner: "dots" });
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
                if (!globalOpts.quiet)
                    console.log(`🔍 Auto-detected schema: ${schemaPath}`);
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
        const modelsObject = (0, prismaParser_1.parsePrismaSchema)(schemaPath);
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
        if (!globalOpts.quiet && !opts.noLog)
            spinner.start("Preparing generation order and state...");
        const generatedDataMap = {};
        // Order models so that those without required inbound relations are seeded first
        const modelNameToModel = Object.fromEntries(allModels.map(m => [m.name, m]));
        function hasRequiredInboundRelations(m) {
            for (const field of m.fields) {
                // If this field is a required foreign key to another model, this model depends on others
                if (field.relationFromFields && field.relationFromFields.length > 0) {
                    // If FK field is optional, we can seed without the parent existing
                    if (!field.isOptional)
                        return true;
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
                if (!hasRequiredInboundRelations(m))
                    queue.push(m.name);
            }
            const ordered = [];
            const visited = new Set();
            while (queue.length) {
                const name = queue.shift();
                if (!name || visited.has(name))
                    continue;
                visited.add(name);
                const model = modelNameToModel[name];
                if (model)
                    ordered.push(model);
                for (const [n, deps] of dependsOn) {
                    if (deps.has(name)) {
                        deps.delete(name);
                        incoming.set(n, deps.size);
                        if (deps.size === 0)
                            queue.push(n);
                    }
                }
            }
            for (const m of models) {
                if (!visited.has(m.name))
                    ordered.push(m);
            }
            return ordered;
        }
        const seedingOrder = topologicalOrder(filteredModels);
        const seedDataByModel = {};
        if (!globalOpts.quiet && !opts.noLog)
            spinner.succeed("Order prepared. Starting data generation...");
        // First pass: generate all models without relations
        for (const model of seedingOrder) {
            if (!globalOpts.quiet && !opts.noLog)
                spinner.start(`📦 Generating data for model: ${model.name}`);
            const config = mockConfig?.[model.name];
            // Generate raw records without relations first
            const rawGen = (0, generateMockData_1.generateMockData)(model, {
                count,
                relationData: {},
                config: { ...config, sqlMode: false },
                preset: opts.preset || null
            });
            const rawRecords = rawGen.records;
            // Store raw records so downstream relations use plain values (not SQL-safe strings)
            generatedDataMap[model.name] = rawRecords;
            // File writing will be done after relations are populated
            if (opts.seed) {
                const scalarFieldNames = new Set(model.fields.filter(f => f.isScalar || f.isId).map(f => f.name));
                const cleanRecords = rawRecords.map(rec => {
                    const out = {};
                    for (const key of Object.keys(rec)) {
                        if (scalarFieldNames.has(key))
                            out[key] = rec[key];
                    }
                    return out;
                });
                seedDataByModel[model.name] = cleanRecords;
            }
            if (!globalOpts.quiet && !opts.noLog)
                spinner.succeed(`Finished processing model: ${model.name}`);
        }
        // Second pass: populate relations based on depth (unless --no-nest is specified)
        // Generate relations if --relations flag is passed OR if depth > 1
        // Commander maps --no-nest to opts.nest === false
        const shouldGenerateRelations = (opts.relations || depth > 1) && opts.nest !== false;
        if (shouldGenerateRelations) {
            if (!globalOpts.quiet && !opts.noLog)
                spinner.start("🔗 Populating relations...");
            // If --relations is used alone (depth=1), use depth=2 for meaningful nesting
            const effectiveDepth = opts.relations && depth === 1 ? 2 : depth;
            const buildRelationData = (currentModel, currentDepth, visited = new Set()) => {
                if (currentDepth > effectiveDepth)
                    return {};
                if (visited.has(currentModel.name))
                    return {};
                visited.add(currentModel.name);
                const relationData = {};
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
                                    if (opts.preset && relationPresets[opts.preset] && relationPresets[opts.preset][currentModel.name]) {
                                        const presetConfig = relationPresets[opts.preset]?.[currentModel.name]?.[field.name];
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
                                }
                                else {
                                    // For single relations, pick one record and nest it
                                    const selectedRecord = relatedRecords[Math.floor(Math.random() * relatedRecords.length)] || null;
                                    if (selectedRecord) {
                                        const nestedRecord = { ...selectedRecord };
                                        const nestedData = buildRelationData(relatedModel, currentDepth + 1, new Set(visited));
                                        Object.assign(nestedRecord, nestedData);
                                        relationData[field.name] = nestedRecord;
                                    }
                                    else {
                                        relationData[field.name] = null;
                                    }
                                }
                            }
                            else {
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
                    if (!globalOpts.quiet && !opts.noLog)
                        console.log(`🔗 Adding relations to ${model.name}:`, Object.keys(relationData));
                    // Regenerate with relations
                    const rawGen = (0, generateMockData_1.generateMockData)(model, {
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
                    if (!globalOpts.quiet && !opts.noLog)
                        console.log(`🔗 Processing ${posts.length} posts`);
                    // Update posts to reference actual User IDs and fix field conflicts
                    generatedDataMap['Post'] = posts.map((post, index) => {
                        const user = users[index % users.length];
                        return {
                            ...post,
                            authorId: user?.['id'], // Use authorId for posts (matches schema)
                            userId: undefined, // Remove conflicting userId field
                            author: { id: user?.['id'], name: user?.['name'], email: user?.['email'] },
                            user: undefined // Remove conflicting user field
                        };
                    });
                    // Update User posts with nested post objects
                    generatedDataMap['User'] = users.map(user => {
                        const userPosts = generatedDataMap['Post']?.filter(p => p['authorId'] === user['id']) || [];
                        // Apply preset count for posts if specified
                        let postsToUse = userPosts;
                        if (opts.preset && relationPresets[opts.preset] && relationPresets[opts.preset]['User'] && relationPresets[opts.preset]['User']?.['posts']) {
                            const presetConfig = relationPresets[opts.preset]['User']?.['posts'];
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
                    if (!globalOpts.quiet && !opts.noLog)
                        console.log(`🔗 Processing ${comments.length} comments`);
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
                        if (opts.preset && relationPresets[opts.preset] && relationPresets[opts.preset]['User'] && relationPresets[opts.preset]['User']?.['comments']) {
                            const presetConfig = relationPresets[opts.preset]['User']?.['comments'];
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
                    if (!globalOpts.quiet && !opts.noLog)
                        console.log(`🔗 Processing User-Team relationships`);
                    // Create user-team associations
                    const userTeamAssociations = [];
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
            if (!globalOpts.quiet && !opts.noLog)
                spinner.succeed("Relations populated.");
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
            if (!globalOpts.quiet && !opts.noLog)
                spinner.start("🔄 Deduplicating records...");
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
            if (!globalOpts.quiet && !opts.noLog)
                spinner.succeed("Records deduplicated.");
        }
        // Write files with final data (including relations)
        if (outputDir) {
            for (const model of seedingOrder) {
                const finalRecords = generatedDataMap[model.name];
                if (finalRecords && finalRecords.length > 0) {
                    // Handle pretty printing: default is true, unless --no-pretty is specified
                    const shouldPretty = opts.pretty !== false && !opts.noPretty;
                    const written = (0, writeMockDataToFile_1.writeMockDataToFile)(model.name, finalRecords, outputDir, opts.format, shouldPretty);
                    if (!globalOpts.quiet && !opts.noLog)
                        console.log(`✅ Saved data for ${model.name} → ${written}`);
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
                faker_1.faker.seed(seedValue);
                if (!globalOpts.quiet && !opts.noLog)
                    console.log(`🎲 Using seed value: ${seedValue}`);
            }
            // Write seed JSON into the Prisma project
            const prismaProject = path.resolve(path.dirname(schemaPath), "..");
            const seedFile = path.join(prismaProject, "__mocktail_seed.json");
            const payload = {
                order: seedingOrder.map(m => m.name),
                data: seedDataByModel,
            };
            fs.writeFileSync(seedFile, JSON.stringify(payload, null, 2), "utf8");
            if (!globalOpts.quiet && !opts.noLog)
                console.log(`\n✅ Mock data JSON saved to: ${seedFile}`);
            // Ensure Prisma Client is generated in the target project
            const run = (cmd, args, cwd) => new Promise((resolve) => {
                const child = (0, child_process_1.spawn)(cmd, args, { cwd, stdio: 'inherit', shell: true });
                child.on('exit', (code) => resolve(code));
            });
            if (!globalOpts.quiet && !opts.noLog)
                console.log("\n🧩 Generating Prisma Client in target project...");
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
            if (!globalOpts.quiet && !opts.noLog)
                console.log("\n🌱 Spawning seeding process in Prisma project...");
            const seedCode = await run('node', [runnerPath], prismaProject);
            try {
                fs.unlinkSync(runnerPath);
            }
            catch { }
            if (seedCode === 0) {
                if (!globalOpts.quiet && !opts.noLog)
                    console.log('🌱 Seeding complete!');
                if (!globalOpts.quiet && !opts.noLog)
                    console.log("\n✅ Mock data generation completed.");
                process.exit(0);
            }
            else {
                console.error('❌ Seeding failed!');
                process.exit(1);
            }
        }
        else {
            if (!globalOpts.quiet && !opts.noLog)
                console.log("\n✅ Mock data generation completed.");
            process.exit(0);
        }
    }
    catch (error) {
        spinner.fail("Failed!");
        console.error("❌ Error:", error.message || error);
        process.exit(1);
    }
});
// Override generate command help with colorful custom output including --seed-value
const generateCmd = program.commands.find(cmd => cmd.name() === "generate");
if (generateCmd) {
    generateCmd.helpInformation = function () {
        return `
${chalk_1.default.hex('#00d8c9').bold('Usage:')} ${chalk_1.default.greenBright('mocktail-cli generate')} ${chalk_1.default.yellow('[options]')}

${chalk_1.default.cyan('Generate mock data for a Prisma schema')}

${chalk_1.default.magenta('Options:')}
  ${chalk_1.default.green('-c, --count <number>')}   ${chalk_1.default.gray(`Number of records per model (default: "5")`)}
  ${chalk_1.default.green('-o, --out <directory>')}  ${chalk_1.default.gray('Output directory')}
  ${chalk_1.default.green('-f, --format <type>')}    ${chalk_1.default.gray(`Output format: json, sql, ts, csv (default: "json")`)}
  ${chalk_1.default.green('-s, --schema <path>')}    ${chalk_1.default.gray(`Prisma schema path (default: "./prisma/schema.prisma")`)}
  ${chalk_1.default.green('-m, --models <models>')}  ${chalk_1.default.gray('Comma-separated list of models (optional)')}
  ${chalk_1.default.green('--mock-config <path>')}   ${chalk_1.default.gray('Path to mocktail-cli.config.js')}
  ${chalk_1.default.green('-d, --depth <number>')}   ${chalk_1.default.gray(`Nested relation depth - depth > 1 enables relations (default: "1")`)}
  ${chalk_1.default.green('--no-nest')}              ${chalk_1.default.gray('Disable nested relations (flat structure)')}
  ${chalk_1.default.green('--relations')}            ${chalk_1.default.gray('Enable automatic relation generation (works with any depth)')}
  ${chalk_1.default.green('--dedupe')}               ${chalk_1.default.gray('Enable deduplication of records')}
  ${chalk_1.default.green('--pretty')}               ${chalk_1.default.gray('Pretty-print JSON output (default: true)')}
  ${chalk_1.default.green('--no-log')}               ${chalk_1.default.gray('Suppress console logs during mock generation')}
  ${chalk_1.default.green('--seed')}                 ${chalk_1.default.gray('Insert mock data into DB')}
  ${chalk_1.default.green('--seed-value <number>')}  ${chalk_1.default.gray('Seed value for reproducible data generation')}
  ${chalk_1.default.green('--preset <type>')}        ${chalk_1.default.gray('Relation preset: blog, ecommerce, social')}
  ${chalk_1.default.green('--force-logo')}           ${chalk_1.default.gray('Force show the logo animation even if shown before')}
  ${chalk_1.default.green('-h, --help')}             ${chalk_1.default.gray('display help for command')}
`;
    };
}
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
        await (0, printMocktailLogo_1.default)();
    }
    // Now parse commands normally, command actions will NOT print logo again
    program.parse(process.argv);
})();
