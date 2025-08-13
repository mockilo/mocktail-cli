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

// Format values for SQL output
function safeValue(value, { sqlMode = false } = {}) {
  if (!sqlMode) return value; // keep raw for JSON output

  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
  if (Array.isArray(value)) {
    // Store arrays as JSON string in SQL
    return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  }
  // Fallback to JSON stringify for objects
  return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
}

/**
 * Generate mock data for a single model descriptor.
 *
 * model: { name: 'User', fields: [ { name, type, isScalar, isRelation, isArray, isId, relationFromFields } ] }
 * options:
 *   count: number
 *   customFields: { fieldName: () => value }
 *   relationData: { relationFieldName: [ relatedRecord | id | primitive ] }
 *   config: { sqlMode?: boolean }
 */
function generateMockData(model, options = {}) {
  const {
    count = 10,
    customFields = {},
    relationData = {},
    config = {}
  } = options;
  const { sqlMode = false } = config;

  const relationIds = {};
  for (const k of Object.keys(relationData || {})) {
    const arr = relationData[k];
    if (!Array.isArray(arr)) continue;
    relationIds[k] = arr.map(extractIdFromItem).filter(Boolean);
  }

  const idField =
    model.fields.find(f => f.isId) || model.fields.find(f => f.name === 'id');

  const records = [];
  for (let i = 0; i < count; i++) {
    const rec = {};

    for (const field of model.fields) {
      // Skip relation fields entirely in SQL mode
      if (field.isRelation) {
        rec[field.name] = field.isArray ? [] : null; // keep for JSON
        continue;
      }

      // Custom field override
      if (customFields && customFields[field.name]) {
        let val =
          typeof customFields[field.name] === 'function'
            ? customFields[field.name](i)
            : customFields[field.name];
        rec[field.name] = safeValue(val, { sqlMode });
        continue;
      }

      // ID generation
      if (field.isId) {
        rec[field.name] = safeValue(generateIdForType(field.type, i), {
          sqlMode
        });
        continue;
      }

      // Generate scalars
      if (field.isScalar) {
        const v = generateField(field.type);
        rec[field.name] = safeValue(v, { sqlMode });
        continue;
      }

      // Fallback
      rec[field.name] = safeValue(null, { sqlMode });
    }

    records.push(rec);
  }

  // Inject relations for JSON mode (never for SQL mode)
  if (!sqlMode) {
    for (const rec of records) {
      for (const field of model.fields) {
        if (!field.isRelation) continue;

        const relName = field.name;
        const ids = relationIds[relName] || [];

        if (field.relationFromFields && field.relationFromFields.length > 0) {
          for (const fk of field.relationFromFields) {
            rec[fk] = chooseRandom(ids);
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
  }

  return records;
}

module.exports = { generateMockData };
