import { CircularDependencyResolver } from '../../src/utils/circularDependencyResolver';
import { Model, Field } from '../../src/types';

describe('CircularDependencyResolver', () => {
  let resolver: CircularDependencyResolver;

  beforeEach(() => {
    resolver = new CircularDependencyResolver();
  });

  describe('Simple Dependencies', () => {
    test('should handle models without dependencies', () => {
      const models: Model[] = [
        createModel('User', [
          { name: 'id', type: 'String', isScalar: true, isRelation: false }
        ]),
        createModel('Post', [
          { name: 'id', type: 'String', isScalar: true, isRelation: false }
        ])
      ];

      const result = resolver.resolveDependencies(models);

      expect(result.cycles).toHaveLength(0);
      expect(result.generationOrder).toHaveLength(2);
      expect(result.resolutionPlan).toBeNull();
    });

    test('should order models with simple dependency', () => {
      const models: Model[] = [
        createModel('Post', [
          { name: 'id', type: 'String', isScalar: true, isRelation: false },
          { name: 'author', type: 'User', isScalar: false, isRelation: true }
        ]),
        createModel('User', [
          { name: 'id', type: 'String', isScalar: true, isRelation: false }
        ])
      ];

      const result = resolver.resolveDependencies(models);

      expect(result.cycles).toHaveLength(0);
      expect(result.generationOrder[0]?.name).toBe('User');
      expect(result.generationOrder[1]?.name).toBe('Post');
    });
  });

  describe('Circular Dependencies', () => {
    test('should detect self-reference cycle', () => {
      const models: Model[] = [
        createModel('User', [
          { name: 'id', type: 'String', isScalar: true, isRelation: false },
          { name: 'manager', type: 'User', isScalar: false, isRelation: true, isOptional: true }
        ])
      ];

      const result = resolver.resolveDependencies(models);

      expect(result.cycles.length).toBeGreaterThan(0);
      const selfRefCycle = result.cycles.find(c => c.type === 'self-reference');
      expect(selfRefCycle).toBeDefined();
      expect(selfRefCycle?.nodes).toContain('User');
    });

    test('should detect simple cycle (User <-> Post)', () => {
      const models: Model[] = [
        createModel('User', [
          { name: 'id', type: 'String', isScalar: true, isRelation: false },
          { name: 'posts', type: 'Post', isScalar: false, isRelation: true, isArray: true }
        ]),
        createModel('Post', [
          { name: 'id', type: 'String', isScalar: true, isRelation: false },
          { name: 'author', type: 'User', isScalar: false, isRelation: true }
        ])
      ];

      const result = resolver.resolveDependencies(models);

      expect(result.cycles.length).toBeGreaterThan(0);
      expect(result.resolutionPlan).toBeDefined();
      expect(result.resolutionPlan?.strategy).toBe('smart-break');
    });

    test('should detect complex cycle (User -> Post -> Comment -> User)', () => {
      const models: Model[] = [
        createModel('User', [
          { name: 'id', type: 'String', isScalar: true, isRelation: false },
          { name: 'posts', type: 'Post', isScalar: false, isRelation: true, isArray: true }
        ]),
        createModel('Post', [
          { name: 'id', type: 'String', isScalar: true, isRelation: false },
          { name: 'author', type: 'User', isScalar: false, isRelation: true },
          { name: 'comments', type: 'Comment', isScalar: false, isRelation: true, isArray: true }
        ]),
        createModel('Comment', [
          { name: 'id', type: 'String', isScalar: true, isRelation: false },
          { name: 'post', type: 'Post', isScalar: false, isRelation: true },
          { name: 'author', type: 'User', isScalar: false, isRelation: true }
        ])
      ];

      const result = resolver.resolveDependencies(models);

      expect(result.cycles.length).toBeGreaterThan(0);
      const complexCycle = result.cycles.find(c => c.type === 'complex-cycle');
      expect(complexCycle).toBeDefined();
    });
  });

  describe('Cycle Strength Classification', () => {
    test('should classify weak cycle (optional relations)', () => {
      const models: Model[] = [
        createModel('User', [
          { name: 'id', type: 'String', isScalar: true, isRelation: false },
          { name: 'profile', type: 'Profile', isScalar: false, isRelation: true, isOptional: true }
        ]),
        createModel('Profile', [
          { name: 'id', type: 'String', isScalar: true, isRelation: false },
          { name: 'user', type: 'User', isScalar: false, isRelation: true }
        ])
      ];

      const result = resolver.resolveDependencies(models);

      expect(result.cycles.length).toBeGreaterThan(0);
      const cycle = result.cycles[0];
      expect(cycle).toBeDefined();
      expect(cycle!.strength).toBe('weak');
    });

    test('should classify strong cycle (required relations)', () => {
      const models: Model[] = [
        createModel('User', [
          { name: 'id', type: 'String', isScalar: true, isRelation: false },
          { name: 'posts', type: 'Post', isScalar: false, isRelation: true, isArray: true }
        ]),
        createModel('Post', [
          { name: 'id', type: 'String', isScalar: true, isRelation: false },
          { name: 'author', type: 'User', isScalar: false, isRelation: true, isOptional: false }
        ])
      ];

      const result = resolver.resolveDependencies(models);

      expect(result.cycles.length).toBeGreaterThan(0);
      const cycle = result.cycles[0];
      expect(cycle).toBeDefined();
      expect(cycle!.strength).toBe('strong');
    });
  });

  describe('Resolution Strategies', () => {
    test('should apply smart-break strategy', () => {
      const models: Model[] = [
        createModel('User', [
          { name: 'id', type: 'String', isScalar: true, isRelation: false },
          { name: 'posts', type: 'Post', isScalar: false, isRelation: true, isArray: true }
        ]),
        createModel('Post', [
          { name: 'id', type: 'String', isScalar: true, isRelation: false },
          { name: 'author', type: 'User', isScalar: false, isRelation: true }
        ])
      ];

      const result = resolver.resolveDependencies(models);

      expect(result.resolutionPlan).toBeDefined();
      expect(result.resolutionPlan?.strategy).toBe('smart-break');
      expect(result.resolutionPlan?.breakPoints.length).toBeGreaterThan(0);
    });

    test('should defer optional relations', () => {
      const models: Model[] = [
        createModel('User', [
          { name: 'id', type: 'String', isScalar: true, isRelation: false },
          { name: 'profile', type: 'Profile', isScalar: false, isRelation: true, isOptional: true }
        ]),
        createModel('Profile', [
          { name: 'id', type: 'String', isScalar: true, isRelation: false },
          { name: 'user', type: 'User', isScalar: false, isRelation: true }
        ])
      ];

      const result = resolver.resolveDependencies(models);

      expect(result.resolutionPlan).toBeDefined();
      expect(result.resolutionPlan?.deferredRelations.length).toBeGreaterThan(0);
    });

    test('should produce valid generation order', () => {
      const models: Model[] = [
        createModel('User', [
          { name: 'id', type: 'String', isScalar: true, isRelation: false },
          { name: 'posts', type: 'Post', isScalar: false, isRelation: true, isArray: true }
        ]),
        createModel('Post', [
          { name: 'id', type: 'String', isScalar: true, isRelation: false },
          { name: 'author', type: 'User', isScalar: false, isRelation: true }
        ])
      ];

      const result = resolver.resolveDependencies(models);

      // With cycles, resolver may duplicate models in order for proper resolution
      expect(result.generationOrder.length).toBeGreaterThanOrEqual(2);
      expect(result.generationOrder.every(m => m.name)).toBe(true);
      // Verify both models are present
      const modelNames = result.generationOrder.map(m => m.name);
      expect(modelNames.includes('User')).toBe(true);
      expect(modelNames.includes('Post')).toBe(true);
    });
  });

  describe('Strategy Management', () => {
    test('should list available strategies', () => {
      const strategies = resolver.getAvailableStrategies();
      
      expect(strategies).toContain('smart-break');
      expect(strategies).toContain('lazy-loading');
      expect(strategies).toContain('partial-references');
    });

    test('should allow changing preferred strategy', () => {
      expect(() => {
        resolver.setPreferredStrategy('lazy-loading');
      }).not.toThrow();
    });

    test('should reject unknown strategy', () => {
      expect(() => {
        resolver.setPreferredStrategy('invalid-strategy');
      }).toThrow();
    });
  });
});

// Helper function to create test models
function createModel(name: string, fields: Partial<Field>[]): Model {
  return {
    name,
    fields: fields.map(f => ({
      name: f.name || 'field',
      type: f.type || 'String',
      rawType: f.rawType || f.type || 'String',
      isArray: f.isArray || false,
      isOptional: f.isOptional || false,
      isScalar: f.isScalar || false,
      isRelation: f.isRelation || false,
      isId: f.isId || false,
      isUnique: f.isUnique || false,
      hasDefault: f.hasDefault || false,
      relationFromFields: f.relationFromFields,
      relationReferences: f.relationReferences,
      relationName: f.relationName
    })),
    modelLevelUniques: []
  };
}
