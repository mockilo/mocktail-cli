const fs = require('fs');

function parseAttributes(attrStr) {
  const attrs = {};
  const relationMatch = attrStr.match(/@relation\(([^)]*)\)/);
  if (relationMatch) {
    const inner = relationMatch[1];
    const fieldsMatch = inner.match(/fields\s*:\s*\[([^\]]+)\]/);
    const refMatch = inner.match(/references\s*:\s*\[([^\]]+)\]/);
    const nameMatch = inner.match(/name\s*:\s*"(.*?)"|name\s*:\s*'(.*?)'/);
    if (fieldsMatch) {
      attrs.relationFields = fieldsMatch[1].split(',').map(s => s.trim());
    }
    if (refMatch) {
      attrs.relationReferences = refMatch[1].split(',').map(s => s.trim());
    }
    if (nameMatch) {
      attrs.relationName = (nameMatch[1] || nameMatch[2]);
    }
  }
  attrs.isId = /@id\b/.test(attrStr);
  attrs.isUnique = /@unique\b/.test(attrStr);
  attrs.hasDefault = /@default\(/.test(attrStr);
  return attrs;
}

function parsePrismaSchema(schemaPath) {
  const raw = fs.readFileSync(schemaPath, 'utf-8');

  // Matches model blocks (non-greedy)
  const modelRegex = /model\s+(\w+)\s*\{([\s\S]*?)\}/g;

  const scalarTypes = new Set(['String','Int','Float','Boolean','DateTime','Json','BigInt','Decimal']);
  const models = {};
  let m;
  while ((m = modelRegex.exec(raw)) !== null) {
    const modelName = m[1];
    const body = m[2];

    const lines = body.split('\n').map(l => l.trim()).filter(l => !!l && !l.startsWith('//') && !l.startsWith('/*'));

    // First, capture model-level unique constraints like @@unique([userId]) or @@unique([a, b])
    const modelLevelUniques = [];
    for (const line of lines) {
      if (line.startsWith('@@unique')) {
        const arrMatch = line.match(/@@unique\s*\(\s*\[([^\]]+)\]/);
        if (arrMatch) {
          const fields = arrMatch[1].split(',').map(s => s.trim());
          modelLevelUniques.push(fields);
        }
      }
    }

    const fields = [];
    for (const line of lines) {
      // skip full-line attributes or block endings
      if (line.startsWith('@') || line.startsWith('@@')) continue;

      // Field lines look like: name Type? @attr(...)
      const fieldMatch = line.match(/^(\w+)\s+([A-Za-z0-9\[\]]+)(\?)?\s*(.*)$/);
      if (!fieldMatch) continue;

      const name = fieldMatch[1];
      const rawType = fieldMatch[2];
      const optionalMark = fieldMatch[3];
      const rest = fieldMatch[4] || '';

      const isArray = /\[\]$/.test(rawType);
      const type = rawType.replace(/\[\]$/, '');
      const isOptional = !!optionalMark || /\?$/.test(rawType);

      const attrs = parseAttributes(rest);
      const isScalar = scalarTypes.has(type);
      const isRelation = !isScalar;

      const field = {
        name,
        type,
        rawType,
        isArray,
        isOptional,
        isScalar,
        isRelation,
        isId: !!attrs.isId,
        isUnique: !!attrs.isUnique,
        hasDefault: !!attrs.hasDefault,
      };

      if (attrs.relationFields) field.relationFromFields = attrs.relationFields.map(s => s.trim());
      if (attrs.relationReferences) field.relationReferences = attrs.relationReferences.map(s => s.trim());
      if (attrs.relationName) field.relationName = attrs.relationName;

      fields.push(field);
    }

    // Mark single-field model-level uniques onto the corresponding field entries
    for (const uniqueGroup of modelLevelUniques) {
      if (uniqueGroup.length === 1) {
        const fName = uniqueGroup[0];
        const field = fields.find(f => f.name === fName);
        if (field) field.isUnique = true;
      }
    }

    models[modelName] = {
      name: modelName,
      fields,
      modelLevelUniques,
    };
  }

  return models;
}

module.exports = { parsePrismaSchema };
