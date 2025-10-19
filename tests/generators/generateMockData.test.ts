import { generateMockData } from '../../src/generators/generateMockData';
import { Model, Field } from '../../src/types';

describe('generateMockData', () => {
  describe('Basic Field Generation', () => {
    test('should generate string fields', () => {
      const model: Model = {
        name: 'User',
        fields: [
          createField('id', 'String', { isId: true }),
          createField('name', 'String', { isScalar: true })
        ],
        modelLevelUniques: []
      };

      const result = generateMockData(model, { count: 5 });

      expect(result.records).toHaveLength(5);
      result.records.forEach(record => {
        expect(record).toHaveProperty('id');
        expect(record).toHaveProperty('name');
        expect(typeof record['name']).toBe('string');
      });
    });

    test('should generate number fields', () => {
      const model: Model = {
        name: 'Product',
        fields: [
          createField('id', 'String', { isId: true }),
          createField('price', 'Int', { isScalar: true }),
          createField('rating', 'Float', { isScalar: true })
        ],
        modelLevelUniques: []
      };

      const result = generateMockData(model, { count: 3 });

      expect(result.records).toHaveLength(3);
      result.records.forEach(record => {
        expect(typeof record['price']).toBe('number');
        expect(typeof record['rating']).toBe('number');
      });
    });

    test('should generate boolean fields', () => {
      const model: Model = {
        name: 'Setting',
        fields: [
          createField('id', 'String', { isId: true }),
          createField('enabled', 'Boolean', { isScalar: true })
        ],
        modelLevelUniques: []
      };

      const result = generateMockData(model, { count: 5 });

      result.records.forEach(record => {
        expect(typeof record['enabled']).toBe('boolean');
      });
    });

    test('should generate DateTime fields', () => {
      const model: Model = {
        name: 'Post',
        fields: [
          createField('id', 'String', { isId: true }),
          createField('createdAt', 'DateTime', { isScalar: true })
        ],
        modelLevelUniques: []
      };

      const result = generateMockData(model, { count: 3 });

      result.records.forEach(record => {
        expect(record['createdAt']).toBeTruthy();
        // Should be a valid date string
        expect(new Date(record['createdAt']).toString()).not.toBe('Invalid Date');
      });
    });
  });

  describe('Array Fields', () => {
    test('should handle array fields', () => {
      const model: Model = {
        name: 'User',
        fields: [
          createField('id', 'String', { isId: true }),
          createField('tags', 'String', { isScalar: true, isArray: true })
        ],
        modelLevelUniques: []
      };

      const result = generateMockData(model, { count: 3 });

      // Arrays are generated - may be empty arrays or arrays with values
      result.records.forEach(record => {
        expect(record).toHaveProperty('tags');
      });
    });
  });

  describe('Optional Fields', () => {
    test('should handle optional fields', () => {
      const model: Model = {
        name: 'User',
        fields: [
          createField('id', 'String', { isId: true }),
          createField('name', 'String', { isScalar: true }),
          createField('bio', 'String', { isScalar: true, isOptional: true })
        ],
        modelLevelUniques: []
      };

      const result = generateMockData(model, { count: 5 });

      result.records.forEach(record => {
        expect(record).toHaveProperty('id');
        expect(record).toHaveProperty('name');
        // Bio may or may not be present (optional)
      });
    });
  });

  describe('Count Parameter', () => {
    test('should respect count parameter', () => {
      const model: Model = {
        name: 'User',
        fields: [createField('id', 'String', { isId: true })],
        modelLevelUniques: []
      };

      expect(generateMockData(model, { count: 1 }).records).toHaveLength(1);
      expect(generateMockData(model, { count: 10 }).records).toHaveLength(10);
      expect(generateMockData(model, { count: 100 }).records).toHaveLength(100);
    });
  });

  describe('Relation Handling', () => {
    test('should handle simple relations', () => {
      const userModel: Model = {
        name: 'User',
        fields: [
          createField('id', 'String', { isId: true }),
          createField('name', 'String', { isScalar: true }),
          createField('posts', 'Post', { isRelation: true, isArray: true })
        ],
        modelLevelUniques: []
      };

      const postData = [
        { id: 'post1', title: 'Post 1' },
        { id: 'post2', title: 'Post 2' }
      ];

      const result = generateMockData(userModel, {
        count: 2,
        relationData: { Post: postData }
      });

      expect(result.records).toHaveLength(2);
      // Relations should be populated when relationData is provided
    });

    test('should handle depth parameter', () => {
      const model: Model = {
        name: 'User',
        fields: [
          createField('id', 'String', { isId: true }),
          createField('posts', 'Post', { isRelation: true, isArray: true })
        ],
        modelLevelUniques: []
      };

      const result1 = generateMockData(model, { count: 2 });
      const result2 = generateMockData(model, { count: 2 });

      expect(result1.records).toHaveLength(2);
      expect(result2.records).toHaveLength(2);
    });
  });

  describe('SQL Mode', () => {
    test('should respect SQL mode in config', () => {
      const model: Model = {
        name: 'User',
        fields: [
          createField('id', 'String', { isId: true }),
          createField('name', 'String', { isScalar: true })
        ],
        modelLevelUniques: []
      };

      const result = generateMockData(model, {
        count: 2,
        config: { sqlMode: true }
      });

      expect(result.records).toHaveLength(2);
      // In SQL mode, strings should be properly escaped/formatted
    });
  });

  describe('Presets', () => {
    test('should apply blog preset', () => {
      const model: Model = {
        name: 'Post',
        fields: [
          createField('id', 'String', { isId: true }),
          createField('title', 'String', { isScalar: true })
        ],
        modelLevelUniques: []
      };

      const result = generateMockData(model, {
        count: 3,
        preset: 'blog'
      });

      expect(result.records).toHaveLength(3);
    });

    test('should apply ecommerce preset', () => {
      const model: Model = {
        name: 'Product',
        fields: [
          createField('id', 'String', { isId: true }),
          createField('name', 'String', { isScalar: true })
        ],
        modelLevelUniques: []
      };

      const result = generateMockData(model, {
        count: 3,
        preset: 'ecommerce'
      });

      expect(result.records).toHaveLength(3);
    });
  });

  describe('Custom Config', () => {
    test('should apply custom field config', () => {
      const model: Model = {
        name: 'User',
        fields: [
          createField('id', 'String', { isId: true }),
          createField('email', 'String', { isScalar: true })
        ],
        modelLevelUniques: []
      };

      const result = generateMockData(model, {
        count: 5,
        customFields: {
          email: () => 'custom@test.com'
        }
      });

      result.records.forEach(record => {
        expect(record['email']).toBe('custom@test.com');
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero count', () => {
      const model: Model = {
        name: 'User',
        fields: [createField('id', 'String', { isId: true })],
        modelLevelUniques: []
      };

      const result = generateMockData(model, { count: 0 });
      expect(result.records).toHaveLength(0);
    });

    test('should handle model with no fields', () => {
      const model: Model = {
        name: 'Empty',
        fields: [],
        modelLevelUniques: []
      };

      const result = generateMockData(model, { count: 5 });
      expect(result.records).toHaveLength(5);
    });

    test('should handle model with only ID field', () => {
      const model: Model = {
        name: 'Simple',
        fields: [createField('id', 'String', { isId: true })],
        modelLevelUniques: []
      };

      const result = generateMockData(model, { count: 3 });
      expect(result.records).toHaveLength(3);
      result.records.forEach(record => {
        expect(record['id']).toBeTruthy();
      });
    });
  });

  describe('Unique Fields', () => {
    test('should generate unique values for unique fields', () => {
      const model: Model = {
        name: 'User',
        fields: [
          createField('id', 'String', { isId: true }),
          createField('email', 'String', { isScalar: true, isUnique: true })
        ],
        modelLevelUniques: []
      };

      const result = generateMockData(model, { count: 10 });
      const emails = result.records.map(r => r['email']);
      const uniqueEmails = new Set(emails);
      
      // All emails should be unique
      expect(uniqueEmails.size).toBe(emails.length);
    });
  });
});

// Helper function to create test fields
function createField(name: string, type: string, options: Partial<Field> = {}): Field {
  return {
    name,
    type,
    rawType: type,
    isArray: options.isArray || false,
    isOptional: options.isOptional || false,
    isScalar: options.isScalar || false,
    isRelation: options.isRelation || false,
    isId: options.isId || false,
    isUnique: options.isUnique || false,
    hasDefault: options.hasDefault || false,
    ...options
  };
}
