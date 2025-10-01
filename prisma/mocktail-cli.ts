// demo script: prisma/mocktail-cli.ts
// This file is a small standalone demo runner that shows how to call the local generators.
import * as fs from 'fs';
import * as path from 'path';
import { parsePrismaSchema } from '../src/schema-parsers/prismaParser';
import { generateMockData } from '../src/generators/generateMockData';
import { exportMockData } from '../src/exporters';

// Usage: node prisma/mocktail-cli.ts [path/to/schema.prisma]
const schemaArg = process.argv[2] || path.join(__dirname, 'schema.prisma');
if (!fs.existsSync(schemaArg)) {
  console.error('Schema file not found at', schemaArg);
  process.exit(1);
}

try {
  const models = parsePrismaSchema(schemaArg);
  console.log('Parsed models:', Object.keys(models));
  // If there is a model named User, generate a tiny sample and export to ./mock-output
  if (models['User']) {
    const sample = generateMockData(models['User'], { count: 3 });
    const outDir = path.resolve(process.cwd(), 'mock-output');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    exportMockData('json', sample.records, models['User'].name, outDir);
    console.log('Wrote sample mock data to', outDir);
  } else {
    console.log('No User model found — demo finished.');
  }
} catch (err: any) {
  console.error('Demo runner error:', err.message);
  process.exit(1);
}
