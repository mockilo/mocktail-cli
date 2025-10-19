import { GraphQLSchemaParser } from '../../src/schema-parsers/graphqlParser';
import { TestHelper } from '../setup';

describe('GraphQLSchemaParser', () => {
  let parser: GraphQLSchemaParser;
  let tempDir: string;

  beforeAll(() => {
    parser = new GraphQLSchemaParser();
    tempDir = TestHelper.createTempDir();
  });

  afterAll(() => {
    TestHelper.cleanupTempDir(tempDir);
  });

  describe('Parser Metadata', () => {
    test('should return correct schema type', () => {
      expect(parser.getSchemaType()).toBe('graphql');
    });

    test('should return supported extensions', () => {
      const extensions = parser.getSupportedExtensions();
      expect(extensions).toContain('.graphql');
      expect(extensions).toContain('.gql');
    });

    test('should correctly identify parseable files', () => {
      expect(parser.canParse('schema.graphql')).toBe(true);
      expect(parser.canParse('schema.gql')).toBe(true);
      expect(parser.canParse('schema.prisma')).toBe(false);
      expect(parser.canParse('schema.ts')).toBe(false);
    });
  });

  describe('Type Parsing', () => {
    test('should parse basic type definitions', () => {
      const schema = `
        type User {
          id: ID!
          name: String!
          email: String!
          age: Int
        }
      `;

      const schemaPath = TestHelper.createTestSchema(tempDir, 'basic.graphql', schema);
      const models = parser.parseSchema(schemaPath);

      expect(models['User']).toBeDefined();
      const userModel = models['User']!;
      expect(userModel.name).toBe('User');
      expect(userModel.fields).toHaveLength(4);
    });

    test('should parse multiple type definitions', () => {
      const schema = `
        type User {
          id: ID!
          name: String!
        }

        type Post {
          id: ID!
          title: String!
        }

        type Comment {
          id: ID!
          content: String!
        }
      `;

      const schemaPath = TestHelper.createTestSchema(tempDir, 'multiple.graphql', schema);
      const models = parser.parseSchema(schemaPath);

      expect(Object.keys(models)).toHaveLength(3);
      expect(models['User']).toBeDefined();
      expect(models['Post']).toBeDefined();
      expect(models['Comment']).toBeDefined();
    });

    test('should parse interface definitions', () => {
      const schema = `
        interface Node {
          id: ID!
          createdAt: DateTime!
        }

        type User implements Node {
          id: ID!
          createdAt: DateTime!
          name: String!
        }
      `;

      const schemaPath = TestHelper.createTestSchema(tempDir, 'interface.graphql', schema);
      const models = parser.parseSchema(schemaPath);

      expect(models['Node']).toBeDefined();
      expect(models['User']).toBeDefined();
    });
  });

  describe('Field Type Detection', () => {
    test('should identify scalar fields', () => {
      const schema = `
        type Product {
          id: ID!
          name: String!
          price: Float!
          quantity: Int!
          available: Boolean!
        }
      `;

      const schemaPath = TestHelper.createTestSchema(tempDir, 'scalars.graphql', schema);
      const models = parser.parseSchema(schemaPath);
      const product = models['Product']!;

      const idField = product.fields.find(f => f.name === 'id')!;
      const nameField = product.fields.find(f => f.name === 'name')!;
      const priceField = product.fields.find(f => f.name === 'price')!;
      const quantityField = product.fields.find(f => f.name === 'quantity')!;
      const availableField = product.fields.find(f => f.name === 'available')!;

      expect(idField.isScalar).toBe(true);
      expect(idField.isId).toBe(true);
      expect(nameField.isScalar).toBe(true);
      expect(priceField.isScalar).toBe(true);
      expect(quantityField.isScalar).toBe(true);
      expect(availableField.isScalar).toBe(true);

      expect(idField.type).toBe('ID');
      expect(nameField.type).toBe('String');
      expect(priceField.type).toBe('Float');
      expect(quantityField.type).toBe('Int');
      expect(availableField.type).toBe('Boolean');
    });

    test('should identify relation fields', () => {
      const schema = `
        type User {
          id: ID!
          posts: [Post!]!
          profile: Profile
        }

        type Post {
          id: ID!
          author: User!
        }

        type Profile {
          id: ID!
          user: User!
        }
      `;

      const schemaPath = TestHelper.createTestSchema(tempDir, 'relations.graphql', schema);
      const models = parser.parseSchema(schemaPath);
      const user = models['User']!;

      const postsField = user.fields.find(f => f.name === 'posts')!;
      const profileField = user.fields.find(f => f.name === 'profile')!;

      expect(postsField.isRelation).toBe(true);
      expect(postsField.isScalar).toBe(false);
      expect(postsField.type).toBe('Post');

      expect(profileField.isRelation).toBe(true);
      expect(profileField.isScalar).toBe(false);
      expect(profileField.type).toBe('Profile');
    });

    test('should identify custom scalar fields', () => {
      const schema = `
        type Event {
          id: ID!
          date: Date!
          timestamp: DateTime!
          metadata: JSON
          url: URL
          email: EmailAddress
        }
      `;

      const schemaPath = TestHelper.createTestSchema(tempDir, 'custom-scalars.graphql', schema);
      const models = parser.parseSchema(schemaPath);
      const event = models['Event']!;

      const dateField = event.fields.find(f => f.name === 'date')!;
      const timestampField = event.fields.find(f => f.name === 'timestamp')!;
      const metadataField = event.fields.find(f => f.name === 'metadata')!;

      expect(dateField.isScalar).toBe(true);
      expect(timestampField.isScalar).toBe(true);
      expect(metadataField.isScalar).toBe(true);
    });
  });

  describe('Field Modifiers', () => {
    test('should parse required fields (non-null)', () => {
      const schema = `
        type User {
          id: ID!
          name: String!
          email: String
        }
      `;

      const schemaPath = TestHelper.createTestSchema(tempDir, 'required.graphql', schema);
      const models = parser.parseSchema(schemaPath);
      const user = models['User']!;

      const idField = user.fields.find(f => f.name === 'id')!;
      const nameField = user.fields.find(f => f.name === 'name')!;
      const emailField = user.fields.find(f => f.name === 'email')!;

      expect(idField.isOptional).toBe(false);
      expect(nameField.isOptional).toBe(false);
      expect(emailField.isOptional).toBe(true);
    });

    test('should parse array fields', () => {
      const schema = `
        type User {
          id: ID!
          tags: [String!]!
          posts: [Post!]
          scores: [Int]
        }

        type Post {
          id: ID!
        }
      `;

      const schemaPath = TestHelper.createTestSchema(tempDir, 'arrays.graphql', schema);
      const models = parser.parseSchema(schemaPath);
      const user = models['User']!;

      const tagsField = user.fields.find(f => f.name === 'tags')!;
      const postsField = user.fields.find(f => f.name === 'posts')!;
      const scoresField = user.fields.find(f => f.name === 'scores')!;

      expect(tagsField.isArray).toBe(true);
      expect(tagsField.type).toBe('String');
      expect(postsField.isArray).toBe(true);
      expect(postsField.type).toBe('Post');
      expect(scoresField.isArray).toBe(true);
      expect(scoresField.type).toBe('Int');
    });

    test('should parse complex array types', () => {
      const schema = `
        type Blog {
          id: ID!
          requiredPosts: [Post!]!
          optionalPosts: [Post]
          nullableItemsArray: [Post!]
        }

        type Post {
          id: ID!
        }
      `;

      const schemaPath = TestHelper.createTestSchema(tempDir, 'complex-arrays.graphql', schema);
      const models = parser.parseSchema(schemaPath);
      const blog = models['Blog']!;

      expect(blog.fields).toHaveLength(4);
      blog.fields.forEach(field => {
        if (field.name !== 'id') {
          expect(field.isArray).toBe(true);
        }
      });
    });
  });

  describe('Schema Validation', () => {
    test('should validate correct schema', () => {
      const schema = `
        type User {
          id: ID!
          name: String!
        }
      `;

      const schemaPath = TestHelper.createTestSchema(tempDir, 'valid.graphql', schema);
      const validation = parser.validateSchema(schemaPath);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.schemaType).toBe('graphql');
    });

    test('should detect invalid syntax (unbalanced braces)', () => {
      const schema = `
        type User {
          id: ID!
          name: String!
      `;

      const schemaPath = TestHelper.createTestSchema(tempDir, 'unbalanced.graphql', schema);
      const validation = parser.validateSchema(schemaPath);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    test('should detect missing type definitions', () => {
      const schema = `
        # Just comments, no types
        # This is an empty schema
      `;

      const schemaPath = TestHelper.createTestSchema(tempDir, 'empty.graphql', schema);
      const validation = parser.validateSchema(schemaPath);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('No type definitions found');
    });

    test('should handle non-existent file', () => {
      const validation = parser.validateSchema('nonexistent.graphql');

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    test('should handle schema with comments', () => {
      const schema = `
        # This is a User type
        type User {
          # The unique identifier
          id: ID!
          # The user's full name
          name: String!
        }
      `;

      const schemaPath = TestHelper.createTestSchema(tempDir, 'comments.graphql', schema);
      const models = parser.parseSchema(schemaPath);

      expect(models).toBeDefined();
      expect(Object.keys(models).length).toBeGreaterThan(0);
      expect(models['User']).toBeDefined();
      if (models['User']) {
        expect(models['User'].fields.length).toBeGreaterThanOrEqual(2);
      }
    });

    test('should handle schema with directives', () => {
      const schema = `
        type User @auth {
          id: ID!
          email: String! @unique
          name: String!
        }
      `;

      const schemaPath = TestHelper.createTestSchema(tempDir, 'directives.graphql', schema);
      const models = parser.parseSchema(schemaPath);

      expect(models['User']).toBeDefined();
      // Directives should not interfere with parsing
      const emailField = models['User']!.fields.find(f => f.name === 'email');
      expect(emailField).toBeDefined();
    });

    test('should handle empty type', () => {
      const schema = `
        type EmptyType {
        }

        type User {
          id: ID!
        }
      `;

      const schemaPath = TestHelper.createTestSchema(tempDir, 'empty-type.graphql', schema);
      const models = parser.parseSchema(schemaPath);

      expect(models['EmptyType']).toBeDefined();
      expect(models['EmptyType']!.fields).toHaveLength(0);
    });

    test('should handle schema with whitespace variations', () => {
      const schema = `
        type   User   {
          id:ID!
          name  :  String!
          email:String
        }
      `;

      const schemaPath = TestHelper.createTestSchema(tempDir, 'whitespace.graphql', schema);
      const models = parser.parseSchema(schemaPath);

      expect(models['User']).toBeDefined();
      expect(models['User']!.fields.length).toBeGreaterThan(0);
    });
  });

  describe('Real-world Schemas', () => {
    test('should parse blog schema', () => {
      const schema = `
        type User {
          id: ID!
          username: String!
          email: String!
          posts: [Post!]!
          comments: [Comment!]!
          createdAt: DateTime!
        }

        type Post {
          id: ID!
          title: String!
          content: String!
          published: Boolean!
          author: User!
          comments: [Comment!]!
          tags: [String!]!
          createdAt: DateTime!
          updatedAt: DateTime!
        }

        type Comment {
          id: ID!
          content: String!
          author: User!
          post: Post!
          createdAt: DateTime!
        }
      `;

      const schemaPath = TestHelper.createTestSchema(tempDir, 'blog.graphql', schema);
      const models = parser.parseSchema(schemaPath);

      expect(Object.keys(models)).toHaveLength(3);
      expect(models['User']).toBeDefined();
      expect(models['Post']).toBeDefined();
      expect(models['Comment']).toBeDefined();

      // Check User relations
      const user = models['User']!;
      const userPosts = user.fields.find(f => f.name === 'posts')!;
      expect(userPosts.isRelation).toBe(true);
      expect(userPosts.isArray).toBe(true);
      expect(userPosts.type).toBe('Post');

      // Check Post fields
      const post = models['Post']!;
      expect(post.fields.length).toBeGreaterThan(5);
    });

    test('should parse e-commerce schema', () => {
      const schema = `
        type Product {
          id: ID!
          name: String!
          description: String
          price: Float!
          stock: Int!
          category: Category!
          reviews: [Review!]!
        }

        type Category {
          id: ID!
          name: String!
          products: [Product!]!
        }

        type Review {
          id: ID!
          rating: Int!
          comment: String
          product: Product!
          user: User!
        }

        type User {
          id: ID!
          name: String!
          email: String!
          reviews: [Review!]!
        }
      `;

      const schemaPath = TestHelper.createTestSchema(tempDir, 'ecommerce.graphql', schema);
      const models = parser.parseSchema(schemaPath);

      expect(Object.keys(models)).toHaveLength(4);
      expect(models['Product']!.fields.find(f => f.name === 'price')!.type).toBe('Float');
      expect(models['Product']!.fields.find(f => f.name === 'stock')!.type).toBe('Int');
    });
  });
});
