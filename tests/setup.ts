// Test setup and utilities
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class TestHelper {
  static createTempDir(): string {
    const tmpDir = path.join(os.tmpdir(), `mocktail-test-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
    return tmpDir;
  }

  static cleanupTempDir(dir: string): void {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  static createTestSchema(dir: string, filename: string, content: string): string {
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, content, 'utf8');
    return filePath;
  }

  static readJsonFile(filePath: string): any {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }
}

// Mock data samples
export const SAMPLE_PRISMA_SCHEMA = `
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id    String @id @default(uuid())
  name  String
  email String @unique
  posts Post[]
}

model Post {
  id       String @id @default(uuid())
  title    String
  content  String?
  author   User   @relation(fields: [authorId], references: [id])
  authorId String
}
`;

export const SAMPLE_GRAPHQL_SCHEMA = `
type User {
  id: ID!
  name: String!
  email: String!
  posts: [Post!]!
}

type Post {
  id: ID!
  title: String!
  content: String!
  author: User!
}
`;

export const SAMPLE_TYPESCRIPT_SCHEMA = `
export interface User {
  id: string;
  name: string;
  email: string;
  posts: Post[];
}

export interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
}
`;
