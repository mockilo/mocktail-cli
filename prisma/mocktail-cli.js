// demo script: prisma/mocktail-cli.js
// This file is a small standalone demo runner that shows how to call the local generators.
const fs = require('fs');
const path = require('path');
const { parsePrismaSchema } = require('../src/schema-parsers/prismaParser');
const { generateMockData } = require('../src/generators/generateMockData');
const { exportMockData } = require('../src/exporters');

// Usage: node prisma/mocktail-cli.js [path/to/schema.prisma]
const schemaArg = process.argv[2] || path.join(__dirname, 'schema.prisma');
if (!fs.existsSync(schemaArg)) {
  console.error('Schema file not found at', schemaArg);
  process.exit(1);
}

try {
  const models = parsePrismaSchema(schemaArg);
  console.log('Parsed models:', Object.keys(models));
  // If there is a model named User, generate a tiny sample and export to ./mock-output
  if (models.User) {
    const sample = generateMockData(models.User, { count: 3 });
    const outDir = path.resolve(process.cwd(), 'mock-output');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    exportMockData('json', sample, models.User.name, outDir);
    console.log('Wrote sample mock data to', outDir);
  } else {
    console.log('No User model found — demo finished.');
  }
} catch (err) {
  console.error('Demo runner error:', err.message);
  process.exit(1);
}
