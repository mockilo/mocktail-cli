console.log("🛠️ Running generate.ts from:", __filename);

import * as path from "path";
import * as fs from "fs";
import { parsePrismaSchema } from "../schema-parsers/prismaParser";
import { generateField } from "../generators/baseGenerators";
import { spawn } from "child_process";
import type { ModelsMap } from '../types';

// Load the user's .env
require("dotenv").config({ path: path.join(process.cwd(), ".env") });

interface GenerateOptions {
  schema: string;
  count: number;
  seed: boolean;
  output: string;
}

async function runGenerate({ schema, count, seed, output }: GenerateOptions): Promise<void> {
  const models: ModelsMap = parsePrismaSchema(schema);
  console.log("Parsed Models and Fields:");
  console.log(JSON.stringify(models, null, 2));
  console.log(`Generating ${count} records per model...\n`);

  count = parseInt(String(count), 10);
  const generatedData: Record<string, Record<string, any>[]> = {};

  for (const modelName in models) {
    console.log(`- 📦 Generating data for model: ${modelName}`);
    generatedData[modelName] = [];

    const modelOutputDir = path.resolve(output);
    if (!fs.existsSync(modelOutputDir)) fs.mkdirSync(modelOutputDir, { recursive: true });

    for (let i = 0; i < count; i++) {
      const record: Record<string, any> = {};
      const fields = models[modelName]?.fields || [];
      for (const field of fields) {
        record[field.name] = generateField(field);
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

export { runGenerate };
