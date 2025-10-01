import * as fs from "fs";
import * as path from "path";
import type { SeedData } from '../types';

const seedFile = path.join(process.cwd(), "__mocktail_seed.json"); // current folder
if (!fs.existsSync(seedFile)) {
  console.error("❌ Mock data JSON not found. Run the CLI first.");
  process.exit(1);
}

const data: SeedData = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
const { PrismaClient } = require("@prisma/client"); // Node resolves locally
const prisma = new PrismaClient();

(async () => {
  try {
    const order = Array.isArray(data.order) ? data.order : Object.keys(data.data);
    const seedData = data.data || {};
    
    for (const modelName of order) {
      const modelKey = modelName.charAt(0).toLowerCase() + modelName.slice(1);
      if (typeof prisma[modelKey]?.createMany === "function") {
        await prisma[modelKey].createMany({ data: seedData[modelName], skipDuplicates: true });
        console.log(`✅ Seeded ${seedData[modelName]?.length || 0} records into ${modelName}`);
      } else {
        console.warn(`⚠️ No createMany method found for model: ${modelName}`);
      }
    }
    await prisma.$disconnect();
  } catch (err: any) {
    console.error("❌ Error during seeding:", err);
    process.exit(1);
  }
})();
