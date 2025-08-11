#!/usr/bin/env node
//

const { Command } = require("commander");
const path = require("path");
const fs = require("fs");
const os = require("os");
const ora = require("ora").default;
const chalk = require("chalk");
const { writeMockDataToFile } = require("../src/utils/writeMockDataToFile");
const { parsePrismaSchema } = require("../src/schema-parsers/prismaParser");
const { generateMockData } = require("../src/generators/generateMockData");
// Logo
const printMocktailLogo = require('../src/printMocktailLogo');

let formatToSQL = null;
try {
  formatToSQL = require("../src/utils/formatToSQL").default;
} catch {}

let loadMockConfig = null;
try {
  loadMockConfig = require("../src/utils/loadMockConfig").default;
} catch {}

const SEEN_FILE = path.join(os.homedir(), ".mocktail-cli-seen");

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

// GENERATE command
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
  .action(async (opts) => {
    const spinner = ora({ spinner: "dots" });
    try {
      const globalOpts = program.opts();
      // NO LOGO here anymore!

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

      if (!globalOpts.quiet) spinner.start("Generating base mock data for filtered models...");
      const generatedDataMap = {};
      for (const model of filteredModels) {
        const config = mockConfig?.[model.name];
        const data = generateMockData(model, { count, config });
        generatedDataMap[model.name] = data;
      }
      if (!globalOpts.quiet) spinner.succeed("Base mock data generated.");

      for (const model of filteredModels) {
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
        const data = generateMockData(model, { count, relationData, config });

        if (outputDir) {
          const written = writeMockDataToFile(model.name, data, outputDir, opts.format, formatToSQL);
          if (!globalOpts.quiet) console.log(`✅ Saved data for ${model.name} → ${written}`);
        } else {
          if (!globalOpts.quiet) console.dir(data, { depth: null });
        }

        if (opts.seed) {
          const { PrismaClient } = require("@prisma/client");
          const prisma = new PrismaClient();
          const modelClient = prisma[model.name.charAt(0).toLowerCase() + model.name.slice(1)];

          if (modelClient?.createMany) {
            await modelClient.createMany({ data });
            if (!globalOpts.quiet) console.log(`🌱 Seeded ${data.length} records into ${model.name}`);
          } else if (!globalOpts.quiet) {
            console.warn(`⚠️ Skipped seeding ${model.name} (no createMany available)`);
          }

          await prisma.$disconnect();
        }

        if (!globalOpts.quiet) spinner.succeed(`Finished processing model: ${model.name}`);
      }

      if (!globalOpts.quiet) console.log("\n✅ Mock data generation completed.");
      process.exit(0);

    } catch (error) {
      spinner.fail("Failed!");
      console.error("❌ Error:", error.message || error);
      process.exit(1);
    }
  });

// Override generate command help with colorful custom output including --force-logo
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
