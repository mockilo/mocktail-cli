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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const seedFile = path.join(process.cwd(), "__mocktail_seed.json"); // current folder
if (!fs.existsSync(seedFile)) {
    console.error("❌ Mock data JSON not found. Run the CLI first.");
    process.exit(1);
}
const data = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
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
            }
            else {
                console.warn(`⚠️ No createMany method found for model: ${modelName}`);
            }
        }
        await prisma.$disconnect();
    }
    catch (err) {
        console.error("❌ Error during seeding:", err);
        process.exit(1);
    }
})();
