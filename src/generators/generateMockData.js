const { generateField } = require('./baseGenerators');
const { faker } = require('@faker-js/faker');
const { customAlphabet } = require('nanoid');

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 16);

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
    // fallback: return first primitive value found
    for (const k of Object.keys(item)) {
      if (typeof item[k] === 'string' || typeof item[k] === 'number') return item[k];
    }
  }
  return null;
}

function generateIdForType(type, seq) {
  if (type === 'Int' || type === 'BigInt') {
    // simple incremental-ish numeric id
    return typeof seq === 'number' ? seq + 1 : Math.floor(Math.random() * 900000) + 1000;
  }
  // default to nanoid string
  return nanoid();
}

/**
 * Generate mock data for a single model descriptor.
 *
 * model: { name: 'User', fields: [ { name, type, isScalar, isRelation, isArray, isId, relationFromFields } ] }
 * options:
 *   count: number
 *   customFields: { fieldName: () => value }
 *   relationData: { relationFieldName: [ relatedRecord | id | primitive ] }
 */
function generateMockData(model, options = {}) {
  const { count = 10, customFields = {}, relationData = {}, config = {} } = options;

  // Ensure we can index relationData by relation field name -> array of ids
  const relationIds = {};
  for (const k of Object.keys(relationData || {})) {
    const arr = relationData[k];
    if (!Array.isArray(arr)) continue;
    relationIds[k] = arr.map(extractIdFromItem).filter(Boolean);
  }

  // find id field name (prefer explicit isId, otherwise 'id')
  const idField = model.fields.find(f => f.isId) || model.fields.find(f => f.name === 'id');

  const records = [];
  for (let i = 0; i < count; i++) {
    const rec = {};

    // First pass: generate scalar fields and id
    for (const field of model.fields) {
      // Skip relation fields for now (we'll inject based on relationData)
      if (field.isRelation) {
        // Initialize array relations as empty arrays
        if (field.isArray) rec[field.name] = [];
        continue;
      }

      // Custom field override
      if (customFields && customFields[field.name]) {
        rec[field.name] = typeof customFields[field.name] === 'function' ? customFields[field.name](i) : customFields[field.name];
        continue;
      }

      // ID generation
      if (field.isId) {
        rec[field.name] = generateIdForType(field.type, i);
        continue;
      }

      // If this scalar field is part of a relationFromFields (foreign key), leave it empty for now.
      // The relation field (isRelation) will contain relationFromFields pointing to this name.
      // So we don't auto-generate foreign key scalars here.
      // Generate basic scalar values for regular scalar fields
      if (field.isScalar) {
        const v = generateField(field.type);
        rec[field.name] = v;
        continue;
      }

      // Fallback
      rec[field.name] = null;
    }

    records.push(rec);
  }

  // Second pass: inject relation foreign keys using relationIds and relationFromFields
  for (const rec of records) {
    for (const field of model.fields) {
      if (!field.isRelation) continue;

      const relName = field.name;
      const ids = relationIds[relName] || [];

      // If relation defines relationFromFields, use those scalar FK fields
      if (field.relationFromFields && field.relationFromFields.length > 0) {
        for (const fk of field.relationFromFields) {
          const chosen = chooseRandom(ids);
          rec[fk] = chosen;
        }
        continue;
      }

      // Otherwise, try to set the relation field directly
      if (field.isArray) {
        // pick 0..N items
        const n = Math.min(ids.length, Math.floor(Math.random() * 3)); // 0-2 items
        const arr = [];
        for (let j = 0; j < n; j++) arr.push(chooseRandom(ids));
        rec[relName] = arr.filter(Boolean);
      } else {
        rec[relName] = chooseRandom(ids);
      }
    }
  }

  return records;
}

module.exports = { generateMockData };
