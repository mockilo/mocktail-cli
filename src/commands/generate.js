console.log("🛠️ Running generate.js from:", __filename);

const path = require("path");
const fs = require("fs");
const { parsePrismaSchema } = require("../schema-parsers/prismaParser");
const { generateField } = require("../generators/baseGenerators");
const { spawn } = require("child_process");



// Load the user's .env
require("dotenv").config({ path: path.join(process.cwd(), ".env") });

async function runGenerate({ schema, count, seed, output }) {
  const models = parsePrismaSchema(schema);
  console.log("Parsed Models and Fields:");
  console.log(JSON.stringify(models, null, 2));
  console.log(`Generating ${count} records per model...\n`);

  count = parseInt(count, 10);
  const generatedData = {};

  for (const modelName in models) {
    console.log(`- 📦 Generating data for model: ${modelName}`);
    generatedData[modelName] = [];

    const modelOutputDir = path.resolve(output);
    if (!fs.existsSync(modelOutputDir)) fs.mkdirSync(modelOutputDir, { recursive: true });

    for (let i = 0; i < count; i++) {
      const record = {};
      const fields = models[modelName];
      for (const fieldName in fields) {
        record[fieldName] = generateField(fields[fieldName]);
      }
      generatedData[modelName].push(record);
    }

    // Save per-model TS file
    const filePath = path.join(modelOutputDir, `${modelName}.ts`);
    fs.writeFileSync(
      filePath,
      `export const ${modelName} = ${JSON.stringify(generatedData[modelName], null, 2)};`
    );
    console.log(`✅ Saved data for ${modelName} → ${filePath}`);
  }

  // Save full JSON for seeding in Prisma project
  const prismaProject = path.resolve(path.dirname(schema), "..");
  const seedFile = path.join(prismaProject, "__mocktail_seed.json");
  fs.writeFileSync(seedFile, JSON.stringify(generatedData, null, 2));
  console.log(`✅ Mock data JSON saved to: ${seedFile}`);

  // Spawn seeding process inside Prisma project
  if (seed) {
    console.log("\n🌱 Spawning seeding process in Prisma project...");

    const seedRunner = path.join(__dirname, "mocktailSeedRunner.js");

    const child = spawn("node", [seedRunner], {
      cwd: prismaProject,       // 🔑 important for Windows
      stdio: "inherit",
      shell: true,
    });

    child.on("exit", (code) => {
      if (code === 0) console.log("🌱 Seeding complete!");
      else console.error("❌ Seeding failed!");
    });
  }
}

module.exports = { runGenerate };
