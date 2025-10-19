import { PrismaSchemaParser } from '../../src/schema-parsers/prismaParser';
import { TestHelper, SAMPLE_PRISMA_SCHEMA } from '../setup';

describe('PrismaSchemaParser', () => {
  let parser: PrismaSchemaParser;
  let tempDir: string;
  let schemaPath: string;

  beforeEach(() => {
    parser = new PrismaSchemaParser();
    tempDir = TestHelper.createTempDir();
    schemaPath = TestHelper.createTestSchema(tempDir, 'schema.prisma', SAMPLE_PRISMA_SCHEMA);
  });

  afterEach(() => {
    TestHelper.cleanupTempDir(tempDir);
  });

  describe('Schema Type Detection', () => {
    test('should identify .prisma files', () => {
      expect(parser.canParse('schema.prisma')).toBe(true);
      expect(parser.canParse('schema.graphql')).toBe(false);
    });

    test('should return correct schema type', () => {
      expect(parser.getSchemaType()).toBe('prisma');
    });

    test('should support .prisma extension', () => {
      const extensions = parser.getSupportedExtensions();
      expect(extensions).toContain('.prisma');
    });
  });

  describe('Schema Validation', () => {
    test('should validate valid Prisma schema', () => {
      const validation = parser.validateSchema(schemaPath);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.schemaType).toBe('prisma');
    });

    test('should detect missing datasource', () => {
      const invalidSchema = `
        generator client {
          provider = "prisma-client-js"
        }
        model User {
          id String @id
        }
      `;
      const invalidPath = TestHelper.createTestSchema(tempDir, 'invalid.prisma', invalidSchema);
      const validation = parser.validateSchema(invalidPath);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Missing datasource block');
    });

    test('should detect missing generator', () => {
      const invalidSchema = `
        datasource db {
          provider = "postgresql"
          url      = env("DATABASE_URL")
        }
        model User {
          id String @id
        }
      `;
      const invalidPath = TestHelper.createTestSchema(tempDir, 'invalid2.prisma', invalidSchema);
      const validation = parser.validateSchema(invalidPath);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Missing generator block');
    });

    test('should detect missing models', () => {
      const invalidSchema = `
        datasource db {
          provider = "postgresql"
          url      = env("DATABASE_URL")
        }
        generator client {
          provider = "prisma-client-js"
        }
      `;
      const invalidPath = TestHelper.createTestSchema(tempDir, 'invalid3.prisma', invalidSchema);
      const validation = parser.validateSchema(invalidPath);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('No models found');
    });
  });

  describe('Schema Parsing', () => {
    test('should parse models correctly', () => {
      const models = parser.parseSchema(schemaPath);
      
      expect(Object.keys(models)).toHaveLength(2);
      expect(models['User']).toBeDefined();
      expect(models['Post']).toBeDefined();
    });

    test('should parse User model fields', () => {
      const models = parser.parseSchema(schemaPath);
      const userModel = models['User'];
      
      expect(userModel).toBeDefined();
      expect(userModel!.name).toBe('User');
      expect(userModel!.fields).toHaveLength(4); // id, name, email, posts
      
      const idField = userModel!.fields.find(f => f.name === 'id');
      expect(idField?.isId).toBe(true);
      expect(idField?.type).toBe('String');
      
      const emailField = userModel!.fields.find(f => f.name === 'email');
      expect(emailField?.isUnique).toBe(true);
      
      const postsField = userModel!.fields.find(f => f.name === 'posts');
      expect(postsField?.isRelation).toBe(true);
      expect(postsField?.isArray).toBe(true);
    });

    test('should parse Post model with relations', () => {
      const models = parser.parseSchema(schemaPath);
      const postModel = models['Post'];
      
      expect(postModel).toBeDefined();
      expect(postModel!.fields).toHaveLength(5); // id, title, content, author, authorId
      
      const authorField = postModel!.fields.find(f => f.name === 'author');
      expect(authorField?.isRelation).toBe(true);
      expect(authorField?.type).toBe('User');
      expect(authorField?.relationFromFields).toContain('authorId');
      expect(authorField?.relationReferences).toContain('id');
      
      const authorIdField = postModel!.fields.find(f => f.name === 'authorId');
      expect(authorIdField?.isScalar).toBe(true);
      expect(authorIdField?.type).toBe('String');
    });

    test('should handle optional fields', () => {
      const models = parser.parseSchema(schemaPath);
      const postModel = models['Post'];
      
      expect(postModel).toBeDefined();
      const contentField = postModel!.fields.find(f => f.name === 'content');
      expect(contentField?.isOptional).toBe(true);
    });

    test('should handle defaults', () => {
      const models = parser.parseSchema(schemaPath);
      const userModel = models['User'];
      
      expect(userModel).toBeDefined();
      const idField = userModel!.fields.find(f => f.name === 'id');
      expect(idField?.hasDefault).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('should handle schema with comments', () => {
      const schemaWithComments = `
        datasource db {
          provider = "postgresql"
          url      = env("DATABASE_URL")
        }
        
        generator client {
          provider = "prisma-client-js"
        }
        
        // This is a user model
        model User {
          id String @id @default(uuid()) // Unique identifier
          name String // User's full name
        }
      `;
      const path = TestHelper.createTestSchema(tempDir, 'comments.prisma', schemaWithComments);
      const models = parser.parseSchema(path);
      
      expect(models['User']).toBeDefined();
      expect(models['User']!.fields).toHaveLength(2);
    });

    test('should handle model-level unique constraints', () => {
      const schemaWithUnique = `
        datasource db {
          provider = "postgresql"
          url      = env("DATABASE_URL")
        }
        
        generator client {
          provider = "prisma-client-js"
        }
        
        model User {
          id String @id
          email String
          
          @@unique([email])
        }
      `;
      const path = TestHelper.createTestSchema(tempDir, 'unique.prisma', schemaWithUnique);
      const models = parser.parseSchema(path);
      
      expect(models['User']).toBeDefined();
      const emailField = models['User']!.fields.find(f => f.name === 'email');
      expect(emailField?.isUnique).toBe(true);
    });

    test('should handle non-existent file', () => {
      expect(() => {
        parser.parseSchema('/non/existent/path.prisma');
      }).toThrow();
    });
  });
});
