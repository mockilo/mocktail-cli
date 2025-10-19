import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { TestHelper, SAMPLE_PRISMA_SCHEMA } from '../setup';

describe('CLI Integration Tests', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = TestHelper.createTempDir();
  });

  afterEach(() => {
    TestHelper.cleanupTempDir(tempDir);
  });

  describe('Generate Command', () => {
    test('should generate data from Prisma schema', () => {
      const schemaPath = TestHelper.createTestSchema(tempDir, 'schema.prisma', SAMPLE_PRISMA_SCHEMA);
      const outputPath = path.join(tempDir, 'output');

      const cmd = `npx tsx bin/mocktail-cli.ts generate --schema ${schemaPath} --count 5 --out ${outputPath} --no-logo`;
      
      expect(() => {
        execSync(cmd, { cwd: process.cwd(), encoding: 'utf8' });
      }).not.toThrow();

      // Verify output files were created
      expect(fs.existsSync(path.join(outputPath, 'User.json'))).toBe(true);
      expect(fs.existsSync(path.join(outputPath, 'Post.json'))).toBe(true);

      // Verify data structure
      const userData = TestHelper.readJsonFile(path.join(outputPath, 'User.json'));
      expect(Array.isArray(userData)).toBe(true);
      expect(userData).toHaveLength(5);
      expect(userData[0]).toHaveProperty('id');
      expect(userData[0]).toHaveProperty('name');
      expect(userData[0]).toHaveProperty('email');
    });

    test('should generate with specific models filter', () => {
      const schemaPath = TestHelper.createTestSchema(tempDir, 'schema.prisma', SAMPLE_PRISMA_SCHEMA);
      const outputPath = path.join(tempDir, 'output');

      const cmd = `npx tsx bin/mocktail-cli.ts generate --schema ${schemaPath} --models User --count 3 --out ${outputPath} --no-logo`;
      
      execSync(cmd, { cwd: process.cwd(), encoding: 'utf8' });

      expect(fs.existsSync(path.join(outputPath, 'User.json'))).toBe(true);
      
      const userData = TestHelper.readJsonFile(path.join(outputPath, 'User.json'));
      expect(userData).toHaveLength(3);
    });

    test('should generate with relations', () => {
      const schemaPath = TestHelper.createTestSchema(tempDir, 'schema.prisma', SAMPLE_PRISMA_SCHEMA);
      const outputPath = path.join(tempDir, 'output');

      const cmd = `npx tsx bin/mocktail-cli.ts generate --schema ${schemaPath} --count 3 --out ${outputPath} --relations --depth 2 --no-logo`;
      
      execSync(cmd, { cwd: process.cwd(), encoding: 'utf8' });

      const userData = TestHelper.readJsonFile(path.join(outputPath, 'User.json'));
      expect(userData[0]).toHaveProperty('posts');
      expect(Array.isArray(userData[0].posts)).toBe(true);
    });

    test('should generate with locale', () => {
      const schemaPath = TestHelper.createTestSchema(tempDir, 'schema.prisma', SAMPLE_PRISMA_SCHEMA);
      const outputPath = path.join(tempDir, 'output');

      const cmd = `npx tsx bin/mocktail-cli.ts generate --schema ${schemaPath} --models User --count 2 --out ${outputPath} --locale es --no-logo`;
      
      execSync(cmd, { cwd: process.cwd(), encoding: 'utf8' });

      const userData = TestHelper.readJsonFile(path.join(outputPath, 'User.json'));
      // Spanish names should be present (basic check)
      expect(userData[0].name).toBeTruthy();
      expect(typeof userData[0].name).toBe('string');
    });

    test('should generate SQL format', () => {
      const schemaPath = TestHelper.createTestSchema(tempDir, 'schema.prisma', SAMPLE_PRISMA_SCHEMA);
      const outputPath = path.join(tempDir, 'output');

      const cmd = `npx tsx bin/mocktail-cli.ts generate --schema ${schemaPath} --count 2 --out ${outputPath} --format sql --no-logo`;
      
      execSync(cmd, { cwd: process.cwd(), encoding: 'utf8' });

      expect(fs.existsSync(path.join(outputPath, 'User.sql'))).toBe(true);
      
      const sqlContent = fs.readFileSync(path.join(outputPath, 'User.sql'), 'utf8');
      expect(sqlContent).toContain('INSERT INTO');
    });

    test('should handle invalid schema gracefully', () => {
      const invalidPath = path.join(tempDir, 'nonexistent.prisma');

      const cmd = `npx tsx bin/mocktail-cli.ts generate --schema ${invalidPath} --no-logo`;
      
      expect(() => {
        execSync(cmd, { cwd: process.cwd(), encoding: 'utf8', stdio: 'pipe' });
      }).toThrow();
    });

    test('should respect --count option', () => {
      const schemaPath = TestHelper.createTestSchema(tempDir, 'schema.prisma', SAMPLE_PRISMA_SCHEMA);
      const outputPath = path.join(tempDir, 'output');

      const cmd = `npx tsx bin/mocktail-cli.ts generate --schema ${schemaPath} --models User --count 10 --out ${outputPath} --no-logo`;
      
      execSync(cmd, { cwd: process.cwd(), encoding: 'utf8' });

      const userData = TestHelper.readJsonFile(path.join(outputPath, 'User.json'));
      expect(userData).toHaveLength(10);
    });
  });

  describe('Help Command', () => {
    test('should display help', () => {
      const output = execSync('npx tsx bin/mocktail-cli.ts --help', { 
        cwd: process.cwd(), 
        encoding: 'utf8' 
      });

      expect(output).toContain('Usage:');
      expect(output).toContain('generate');
      expect(output).toContain('plugins');
    });

    test('should display generate help', () => {
      const output = execSync('npx tsx bin/mocktail-cli.ts generate --help', { 
        cwd: process.cwd(), 
        encoding: 'utf8' 
      });

      expect(output).toContain('--count');
      expect(output).toContain('--schema');
      expect(output).toContain('--models');
    });
  });

  describe('Version Command', () => {
    test('should display version', () => {
      const output = execSync('npx tsx bin/mocktail-cli.ts --version', { 
        cwd: process.cwd(), 
        encoding: 'utf8' 
      });

      expect(output).toMatch(/\d+\.\d+\.\d+/);
    });
  });
});
