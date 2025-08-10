#!/usr/bin/env node

const { Command } = require("commander");
const path = require("path");
const fs = require("fs");
const ora = require("ora").default;
const { writeMockDataToFile } = require("../src/utils/writeMockDataToFile");
const { parsePrismaSchema } = require("../src/schema-parsers/prismaParser");
const { generateMockData } = require("../src/generators/generateMockData");

let formatToSQL = null;
try {
  formatToSQL = require("../src/utils/formatToSQL").default;
} catch {}

let loadMockConfig = null;
try {
  loadMockConfig = require("../src/utils/loadMockConfig").default;
} catch {}

const program = new Command();

program
  .name("mocktail-cli")
  .description("Prisma-aware mock data generator")
  .version("0.1.0");

// Append README info snippet to help output
program.on("--help", () => {
  console.log("");
  console.log("For detailed documentation, run:");
  console.log("  mocktail-cli docs");
  console.log("Or visit https://github.com/mock-verse");
  console.log("");
});

program
  .command("generate")
  .description("Generate mock data for a Prisma schema")
  .option("-c, --count <number>", "Number of records per model", "5")
  .option("-o, --out <directory>", "Output directory")
  .option("-f, --format <type>", "Output format: json, sql, ts, csv", "json")
  .option("-s, --schema <path>", "Prisma schema path", "./prisma/schema.prisma")
  .option("-m, --models <models>", "Comma-separated list of models (optional)")
  .option("--mock-config <path>", "Path to mocktail-cli.config.js")
  .option("-d, --depth <number>", "Nested relation depth", "1")
  .option("--seed", "Insert mock data into DB")
  .option("-q, --quiet", "Suppress output except errors")
  .action(async (opts) => {
    const spinner = ora({ spinner: "dots" });

    try {
      const schemaPath = path.resolve(process.cwd(), opts.schema);
      if (!fs.existsSync(schemaPath)) {
        console.error(`❌ Schema file not found: ${schemaPath}`);
        process.exit(1);
      }

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

      if (!opts.quiet) spinner.start("Generating base mock data for all models...");
      const generatedDataMap = {};
      for (const model of allModels) {
        const config = mockConfig?.[model.name];
        const data = generateMockData(model, { count, config });
        generatedDataMap[model.name] = data;
      }
      if (!opts.quiet) spinner.succeed("Base mock data generated.");

      for (const model of filteredModels) {
        if (!opts.quiet) spinner.start(`📦 Generating data for model: ${model.name}`);

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
        const data = generateMockData(model, { count, relationData, config });

        if (outputDir) {
          const written = writeMockDataToFile(model.name, data, outputDir, opts.format, formatToSQL);
          if (!opts.quiet) console.log(`✅ Saved data for ${model.name} → ${written}`);
        } else {
          if (!opts.quiet) console.dir(data, { depth: null });
        }

        if (opts.seed) {
          const { PrismaClient } = require("@prisma/client");
          const prisma = new PrismaClient();
          const modelClient = prisma[model.name.charAt(0).toLowerCase() + model.name.slice(1)];

          if (modelClient?.createMany) {
            await modelClient.createMany({ data });
            if (!opts.quiet) console.log(`🌱 Seeded ${data.length} records into ${model.name}`);
          } else if (!opts.quiet) {
            console.warn(`⚠️ Skipped seeding ${model.name} (no createMany available)`);
          }

          await prisma.$disconnect();
        }

        if (!opts.quiet) spinner.succeed(`Finished processing model: ${model.name}`);
      }

      if (!opts.quiet) console.log("\n✅ Mock data generation completed.");
      process.exit(0);

    } catch (error) {
      spinner.fail("Failed!");
      console.error("❌ Error:", error.message || error);
      process.exit(1);
    }
  });

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

program.parse(process.argv);
