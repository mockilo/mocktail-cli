// src/utils/formatToSQL.js
// Safer SQL formatter for generating simple INSERT statements.
// Note: For production seeding prefer parameterized queries or use Prisma client directly.
function escapeSqlValue(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (val instanceof Date) return `'${val.toISOString()}'`;
  // Convert objects/arrays to JSON
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  // Escape single quotes by doubling them
  return `'${String(val).replace(/'/g, "''")}'`;
}

function formatToSQL(modelName, records) {
  if (!Array.isArray(records) || records.length === 0) return '';

  const columns = Object.keys(records[0]);
  const rows = records
    .map((record) =>
      `(${columns.map((col) => escapeSqlValue(record[col])).join(', ')})`
    )
    .join(',\n');

  return `INSERT INTO ${modelName} (${columns.join(', ')}) VALUES\n${rows};`;
}

module.exports = formatToSQL;
