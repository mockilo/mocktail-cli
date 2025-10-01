"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.runGenerate = runGenerate;
console.log("🛠️ Running generate.ts from:", __filename);
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const prismaParser_1 = require("../schema-parsers/prismaParser");
const baseGenerators_1 = require("../generators/baseGenerators");
const child_process_1 = require("child_process");
// Load the user's .env
require("dotenv").config({ path: path.join(process.cwd(), ".env") });
async function runGenerate({ schema, count, seed, output }) {
    const models = (0, prismaParser_1.parsePrismaSchema)(schema);
    console.log("Parsed Models and Fields:");
    console.log(JSON.stringify(models, null, 2));
    console.log(`Generating ${count} records per model...\n`);
    count = parseInt(String(count), 10);
    const generatedData = {};
    for (const modelName in models) {
        console.log(`- 📦 Generating data for model: ${modelName}`);
        generatedData[modelName] = [];
        const modelOutputDir = path.resolve(output);
        if (!fs.existsSync(modelOutputDir))
            fs.mkdirSync(modelOutputDir, { recursive: true });
        for (let i = 0; i < count; i++) {
            const record = {};
            const fields = models[modelName]?.fields || [];
            for (const field of fields) {
                record[field.name] = (0, baseGenerators_1.generateField)(field);
            }
            generatedData[modelName].push(record);
        }
        // Save per-model TS file
        const filePath = path.join(modelOutputDir, `${modelName}.ts`);
        fs.writeFileSync(filePath, `export const ${modelName} = ${JSON.stringify(generatedData[modelName], null, 2)};`);
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
        const child = (0, child_process_1.spawn)("node", [seedRunner], {
            cwd: prismaProject, // 🔑 important for Windows
            stdio: "inherit",
            shell: true,
        });
        child.on("exit", (code) => {
            if (code === 0)
                console.log("🌱 Seeding complete!");
            else
                console.error("❌ Seeding failed!");
        });
    }
}
