"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePrismaSchema = parsePrismaSchema;
const fs = __importStar(require("fs"));
function parseAttributes(attrStr) {
    const attrs = {
        isId: false,
        isUnique: false,
        hasDefault: false
    };
    const relationMatch = attrStr.match(/@relation\(([^)]*)\)/);
    if (relationMatch) {
        const inner = relationMatch[1];
        const fieldsMatch = inner?.match(/fields\s*:\s*\[([^\]]+)\]/);
        const refMatch = inner?.match(/references\s*:\s*\[([^\]]+)\]/);
        const nameMatch = inner?.match(/name\s*:\s*"(.*?)"|name\s*:\s*'(.*?)'/);
        if (fieldsMatch) {
            attrs.relationFields = fieldsMatch[1]?.split(',').map(s => s.trim()) || [];
        }
        if (refMatch) {
            attrs.relationReferences = refMatch[1]?.split(',').map(s => s.trim()) || [];
        }
        if (nameMatch) {
            attrs.relationName = (nameMatch[1] || nameMatch[2] || undefined);
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
    const scalarTypes = new Set(['String', 'Int', 'Float', 'Boolean', 'DateTime', 'Json', 'BigInt', 'Decimal']);
    const models = {};
    let m;
    while ((m = modelRegex.exec(raw)) !== null) {
        const modelName = m[1];
        const body = m[2];
        const lines = body?.split('\n').map(l => l.trim()).filter(l => !!l && !l.startsWith('//') && !l.startsWith('/*')) || [];
        // First, capture model-level unique constraints like @@unique([userId]) or @@unique([a, b])
        const modelLevelUniques = [];
        for (const line of lines) {
            if (line.startsWith('@@unique')) {
                const arrMatch = line.match(/@@unique\s*\(\s*\[([^\]]+)\]/);
                if (arrMatch) {
                    const fields = arrMatch[1]?.split(',').map(s => s.trim()) || [];
                    modelLevelUniques.push(fields);
                }
            }
        }
        const fields = [];
        for (const line of lines) {
            // skip full-line attributes or block endings
            if (line.startsWith('@') || line.startsWith('@@'))
                continue;
            // Field lines look like: name Type? @attr(...)
            const fieldMatch = line.match(/^(\w+)\s+([A-Za-z0-9\[\]]+)(\?)?\s*(.*)$/);
            if (!fieldMatch)
                continue;
            const name = fieldMatch[1];
            const rawType = fieldMatch[2];
            const optionalMark = fieldMatch[3];
            const rest = fieldMatch[4] || '';
            const isArray = /\[\]$/.test(rawType || '');
            const type = (rawType || '').replace(/\[\]$/, '');
            const isOptional = !!optionalMark || /\?$/.test(rawType || '');
            const attrs = parseAttributes(rest);
            const isScalar = scalarTypes.has(type);
            const isRelation = !isScalar;
            const field = {
                name: name || '',
                type,
                rawType: rawType || '',
                isArray,
                isOptional,
                isScalar,
                isRelation,
                isId: !!attrs.isId,
                isUnique: !!attrs.isUnique,
                hasDefault: !!attrs.hasDefault,
            };
            if (attrs.relationFields)
                field.relationFromFields = attrs.relationFields.map(s => s.trim());
            if (attrs.relationReferences)
                field.relationReferences = attrs.relationReferences.map(s => s.trim());
            if (attrs.relationName)
                field.relationName = attrs.relationName;
            fields.push(field);
        }
        // Mark single-field model-level uniques onto the corresponding field entries
        for (const uniqueGroup of modelLevelUniques) {
            if (uniqueGroup.length === 1) {
                const fName = uniqueGroup[0];
                const field = fields.find(f => f.name === fName);
                if (field)
                    field.isUnique = true;
            }
        }
        models[modelName || ''] = {
            name: modelName || '',
            fields,
            modelLevelUniques,
        };
    }
    return models;
}
