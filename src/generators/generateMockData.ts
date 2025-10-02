import { generateField } from './baseGenerators';
import { faker } from '@faker-js/faker';
import { getLocalizedFaker } from '../utils/localeManager';
// import { customAlphabet } from 'nanoid'; // Unused import
import { extensibleTypeSystem, GenerationContext } from '../types/extensibleTypeSystem';
import { circularDependencyResolver } from '../utils/circularDependencyResolver';
import type { Model, GenerateOptions, GeneratedData, RelationPresets } from '../types';

// const nanoid = customAlphabet(
//   '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
//   16
// );

function chooseRandom<T>(arr: T[]): T | null {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)] || null;
}

function extractIdFromItem(item: any): string | null {
  if (item == null) return null;
  if (typeof item === 'string' || typeof item === 'number') return String(item);
  if (typeof item === 'object') {
    if (item.id !== undefined) return String(item.id);
    if (item._id !== undefined) return String(item._id);
    for (const k of Object.keys(item)) {
      if (typeof item[k] === 'string' || typeof item[k] === 'number') return String(item[k]);
    }
  }
  return null;
}

// function generateIdForType(type: string, seq: number | undefined): string | number {
//   if (type === 'Int' || type === 'BigInt') {
//     return typeof seq === 'number'
//       ? seq + 1
//       : Math.floor(Math.random() * 900000) + 1000;
//   }
//   return nanoid();
// }

/**
 * Heuristic to get join table name for many-to-many relation
 * You might want to customize this based on your DB naming conventions.
 */
function getJoinTableName(modelName: string, relationName: string): string {
  // Example: Prisma often names join tables like _ModelNameToRelationName
  return `_${modelName}To${capitalizeFirst(relationName)}`;
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Generate mock data for a single model descriptor.
 *
 * Returns:
 *  {
 *    records: [...],           // main table records
 *    joinTableRecords: {       // many-to-many join table data, e.g. { '_PostToCategory': [ {A: postId, B: categoryId}, ... ] }
 *      [joinTableName]: Array<{A: string, B: string}>
 *    }
 *  }
 */
export function generateMockData(model: Model, options: GenerateOptions = {}): GeneratedData {
  const {
    count = 10,
    customFields = {},
    relationData: initialRelationData = {},
    config = {},
    preset = null
  } = options;
  const { sqlMode = false } = config;

  // Apply preset if specified
  let relationData = { ...initialRelationData };
  if (preset) {
    relationData = generateCustomRelations(model, preset, relationData);
  }

  const relationIds: Record<string, string[]> = {};
  for (const k of Object.keys(relationData || {})) {
    const arr = relationData[k];
    if (!Array.isArray(arr)) continue;
    relationIds[k] = arr.map(extractIdFromItem).filter(Boolean) as string[];
  }

  const idField =
    model.fields.find(f => f.isId) || model.fields.find(f => f.name === 'id');

  const records: Record<string, any>[] = [];

  // For collecting many-to-many join table records
  const joinTableRecords: Record<string, Array<{ A: string; B: string }>> = {};

  for (let i = 0; i < count; i++) {
    const rec: Record<string, any> = {};
    
    for (const field of model.fields) {
      // Skip relation fields entirely in SQL mode (we handle many-to-many later)
      if (field.isRelation) {
        if (!sqlMode) {
          rec[field.name] = field.isArray ? [] : null;
        }
        continue;
      }

      // Custom field override
      if (customFields && customFields[field.name]) {
        let val =
          typeof customFields[field.name] === 'function'
            ? customFields[field.name](i)
            : customFields[field.name];
        rec[field.name] = sqlMode ? safeValue(val, { sqlMode }) : val;
        continue;
      }

      // ID generation
      if (field.isId) {
        const idVal = generateField(field); // Use proper field generation for IDs
        rec[field.name] = sqlMode ? safeValue(idVal, { sqlMode }) : idVal;
        continue;
      }

      // Generate scalars using extensible type system
      if (field.isScalar) {
        const context: GenerationContext = {
          modelName: model.name,
          recordIndex: i,
          relatedFields: rec, // Pass already generated fields for context
          schemaType: 'unknown' // This could be passed from the parser
        };
        
        // Try extensible type system first
        const v = extensibleTypeSystem.generateValue(field, context);
        
        // Fallback to original generator if extensible system returns null
        const finalValue = v !== null ? v : generateField(field);
        
        rec[field.name] = sqlMode ? safeValue(finalValue, { sqlMode }) : finalValue;
        continue;
      }

      // Fallback
      rec[field.name] = sqlMode ? safeValue(null, { sqlMode }) : null;
    }
    
    records.push(rec);
  }

  if (!sqlMode && Object.keys(relationIds).length > 0) {
    // JSON mode: inject relations with respect to unique FK constraints
    // Only run if we have relation data to work with
    // Build pools for unique foreign key fields to avoid duplicates
    const shuffle = (arr: string[]): string[] => {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = a[i!] || '';
        a[i!] = a[j!] || '';
        a[j!] = temp;
      }
      return a;
    };

    const uniqueFkPools = new Map<string, string[]>(); // fkFieldName -> array of ids to consume

    for (const field of model.fields) {
      if (!field.isRelation) continue;
      const relName = field.name;
      const ids = relationIds[relName] || [];

      if (field.relationFromFields && field.relationFromFields.length > 0) {
        for (const fk of field.relationFromFields) {
          const fkField = model.fields.find(f => f.name === fk);
          if (fkField?.isUnique) {
            uniqueFkPools.set(fk, shuffle(ids));
          }
        }
      }
    }

    for (const rec of records) {
      for (const field of model.fields) {
        if (!field.isRelation) continue;

        const relName = field.name;
        const ids = relationIds[relName] || [];

        if (field.relationFromFields && field.relationFromFields.length > 0) {
          for (const fk of field.relationFromFields) {
            const fkField = model.fields.find(f => f.name === fk);
            if (fkField?.isUnique) {
              const pool = uniqueFkPools.get(fk) || [];
              rec[fk] = pool.length > 0 ? pool.pop() : null;
              uniqueFkPools.set(fk, pool);
            } else {
              rec[fk] = chooseRandom(ids);
            }
          }
          continue;
        }

        if (field.isArray) {
          // Check if preset specifies a count for this relation
          const presetCount = (relationData[relName] as any)?.count;
          let n: number;
          if (presetCount) {
            n = Math.min(ids.length, presetCount);
          } else {
            n = Math.min(ids.length, Math.floor(Math.random() * 3));
          }
          const arr: string[] = [];
          for (let j = 0; j < n; j++) {
            const randomId = chooseRandom(ids);
            if (randomId) arr.push(randomId);
          }
          rec[relName] = arr;
        } else {
          rec[relName] = chooseRandom(ids);
        }
      }
    }
  } else {
    // SQL mode: generate many-to-many join table records
    for (const field of model.fields) {
      if (!field.isRelation || !field.isArray) continue; // only many-to-many

      const joinTableName = getJoinTableName(model.name, field.name);
      joinTableRecords[joinTableName] = joinTableRecords[joinTableName] || [];

      for (const rec of records) {
        const relatedIds = relationIds[field.name] || [];
        const relationCount = Math.floor(Math.random() * 3); // 0 to 2 relations per record

        for (let i = 0; i < relationCount; i++) {
          const relatedId = chooseRandom(relatedIds);
          if (!relatedId) continue;

          // A = this model's id, B = related model's id
          // IDs are raw strings, but can be wrapped in quotes later by SQL formatter
          joinTableRecords[joinTableName].push({
            A: rec[idField?.name || 'id'],
            B: relatedId,
          });
        }
      }
    }
  }

  return {
    records,
    joinTableRecords,
  };
}

// Helper to format safe SQL values (like before)
function safeValue(value: any, { sqlMode = false }: { sqlMode?: boolean } = {}): string {
  if (!sqlMode) return value;

  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'string') return value.replace(/'/g, "''");
  if (Array.isArray(value)) {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  }
  return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
}

// Advanced relation presets
const relationPresets: RelationPresets = {
  // Blog/Content Management
  blog: {
    User: {
      posts: { count: { min: 1, max: 5 } },
      comments: { count: { min: 0, max: 10 } }
    },
    Post: {
      comments: { count: { min: 0, max: 15 } },
      categories: { count: { min: 1, max: 3 } }
    }
  },
  
  // E-commerce
  ecommerce: {
    User: {
      orders: { count: { min: 0, max: 8 } },
      reviews: { count: { min: 0, max: 5 } }
    },
    Product: {
      reviews: { count: { min: 0, max: 20 } },
      categories: { count: { min: 1, max: 2 } }
    }
  },
  
  // Social Network
  social: {
    User: {
      posts: { count: { min: 0, max: 10 } },
      followers: { count: { min: 0, max: 50 } },
      following: { count: { min: 0, max: 50 } }
    }
  }
};

// Custom relation generator
function generateCustomRelations(model: Model, preset: string, relationData: Record<string, any>): Record<string, any> {
  const presetConfig = relationPresets[preset as keyof RelationPresets];
  if (!presetConfig || !presetConfig[model.name]) {
    return relationData;
  }
  
  const customData = { ...relationData };
  const modelConfig = presetConfig[model.name];
  
  for (const [relationName, config] of Object.entries(modelConfig || {})) {
    if (config.count) {
      // Generate custom count for this relation
      const count = getLocalizedFaker().number.int(config.count);
      // Store the count for later use in relation generation
      customData[relationName] = { count };
    }
  }
  
  return customData;
}
