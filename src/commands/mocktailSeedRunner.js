const fs = require("fs");
const path = require("path");

const seedFile = path.join(process.cwd(), "__mocktail_seed.json"); // current folder
if (!fs.existsSync(seedFile)) {
  console.error("❌ Mock data JSON not found. Run the CLI first.");
  process.exit(1);
}

const data = require(seedFile);
const { PrismaClient } = require("@prisma/client"); // Node resolves locally
const prisma = new PrismaClient();

(async () => {
  try {
    for (const modelName in data) {
      const modelKey = modelName.charAt(0).toLowerCase() + modelName.slice(1);
      if (typeof prisma[modelKey]?.createMany === "function") {
        await prisma[modelKey].createMany({ data: data[modelName] });
        console.log(`✅ Seeded ${data[modelName].length} records into ${modelName}`);
      } else {
        console.warn(`⚠️ No createMany method found for model: ${modelName}`);
      }
    }
    await prisma.$disconnect();
  } catch (err) {
    console.error("❌ Error during seeding:", err);
    process.exit(1);
  }
})();
