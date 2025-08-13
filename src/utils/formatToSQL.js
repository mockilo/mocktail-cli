// src/utils/formatToSQL.js

function escapeSqlValue(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (val instanceof Date) return `'${val.toISOString()}'`;
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  return `'${String(val).replace(/'/g, "''")}'`;
}

/**
 * Formats records into an SQL INSERT statement.
 *
 * @param {string} modelName - Table name
 * @param {Array<Object>} records - Array of record objects
 * @param {Array<Object>} [fieldsMeta] - Optional Prisma model.fields array for filtering relations
 */
function formatToSQL(modelName, records, fieldsMeta = []) {
  if (!Array.isArray(records) || records.length === 0) return '';

  // If we have model field metadata, filter out relation fields
  let allowedColumns;
  if (fieldsMeta.length > 0) {
    allowedColumns = fieldsMeta
      .filter(f => !f.isRelation) // skip relation fields entirely
      .map(f => f.name);
  } else {
    // fallback: include all keys (older behavior)
    allowedColumns = Object.keys(records[0]);
  }

  const rows = records
    .map((record) =>
      `(${allowedColumns.map((col) => escapeSqlValue(record[col])).join(', ')})`
    )
    .join(',\n');

  return `INSERT INTO "${modelName}" (${allowedColumns.join(', ')}) VALUES\n${rows};`;
}

module.exports = formatToSQL;
