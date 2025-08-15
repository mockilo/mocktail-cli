const { generateField } = require('./baseGenerators');
const { faker } = require('@faker-js/faker');
const { customAlphabet } = require('nanoid');


const nanoid = customAlphabet(
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  16
);

function chooseRandom(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

function extractIdFromItem(item) {
  if (item == null) return null;
  if (typeof item === 'string' || typeof item === 'number') return item;
  if (typeof item === 'object') {
    if (item.id !== undefined) return item.id;
    if (item._id !== undefined) return item._id;
    for (const k of Object.keys(item)) {
      if (typeof item[k] === 'string' || typeof item[k] === 'number') return item[k];
    }
  }
  return null;
}

function generateIdForType(type, seq) {
  if (type === 'Int' || type === 'BigInt') {
    return typeof seq === 'number'
      ? seq + 1
      : Math.floor(Math.random() * 900000) + 1000;
  }
  return nanoid();
}

/**
 * Heuristic to get join table name for many-to-many relation
 * You might want to customize this based on your DB naming conventions.
 */
function getJoinTableName(modelName, relationName) {
  // Example: Prisma often names join tables like _ModelNameToRelationName
  return `_${modelName}To${capitalizeFirst(relationName)}`;
}
function capitalizeFirst(str) {
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
function generateMockData(model, options = {}) {
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

  const relationIds = {};
  for (const k of Object.keys(relationData || {})) {
    const arr = relationData[k];
    if (!Array.isArray(arr)) continue;
    relationIds[k] = arr.map(extractIdFromItem).filter(Boolean);
  }

  const idField =
    model.fields.find(f => f.isId) || model.fields.find(f => f.name === 'id');

  const records = [];

  // For collecting many-to-many join table records
  const joinTableRecords = {};

    for (let i = 0; i < count; i++) {
    const rec = {};

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
        const idVal = generateIdForType(field.type, i);
        rec[field.name] = sqlMode ? safeValue(idVal, { sqlMode }) : idVal;
        continue;
      }

      

            // Generate scalars
      if (field.isScalar) {
        const v = generateField(field); // Pass the whole field object
        rec[field.name] = sqlMode ? safeValue(v, { sqlMode }) : v;
        continue;
      }

      // Fallback
      rec[field.name] = sqlMode ? safeValue(null, { sqlMode }) : null;
    }

    records.push(rec);
  }

  if (!sqlMode) {
    // JSON mode: inject relations with respect to unique FK constraints
    // Build pools for unique foreign key fields to avoid duplicates
    const shuffle = (arr) => {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };

    const uniqueFkPools = new Map(); // fkFieldName -> array of ids to consume

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
          const n = Math.min(ids.length, Math.floor(Math.random() * 3));
          const arr = [];
          for (let j = 0; j < n; j++) arr.push(chooseRandom(ids));
          rec[relName] = arr.filter(Boolean);
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
            A: rec[idField.name],
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
function safeValue(value, { sqlMode = false } = {}) {
  if (!sqlMode) return value;

  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'string') return value.replace(/'/g, "''");
  if (Array.isArray(value)) {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  }
  return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
}

// Advanced relation presets
const relationPresets = {
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
function generateCustomRelations(model, preset, relationData) {
  const presetConfig = relationPresets[preset];
  if (!presetConfig || !presetConfig[model.name]) {
    return relationData;
  }
  
  const customData = { ...relationData };
  const modelConfig = presetConfig[model.name];
  
  for (const [relationName, config] of Object.entries(modelConfig)) {
    if (config.count) {
      // Generate custom count for this relation
      const count = faker.number.int(config.count);
      // Apply custom logic here
    }
  }
  
  return customData;
}

module.exports = { generateMockData };
