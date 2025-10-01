"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateField = generateField;
const faker_1 = require("@faker-js/faker");
// Smart field name detection
const fieldNameGenerators = {
    // Email fields - will be generated consistently with name in generateMockData
    email: () => faker_1.faker.internet.email(),
    // Name fields
    name: () => faker_1.faker.person.fullName(),
    title: () => faker_1.faker.lorem.sentence({ min: 3, max: 8 }),
    // Content fields
    content: () => faker_1.faker.lorem.paragraphs({ min: 1, max: 3 }),
    bio: () => faker_1.faker.lorem.paragraph({ min: 10, max: 50 }),
    // ID fields (should be UUIDs)
    id: () => faker_1.faker.string.uuid(),
    // Foreign key fields (should be UUIDs)
    userId: () => faker_1.faker.string.uuid(),
    authorId: () => faker_1.faker.string.uuid(),
    postId: () => faker_1.faker.string.uuid(),
    companyId: () => faker_1.faker.string.uuid(),
};
// Type-based generators (fallback)
const typeGenerators = {
    String: () => faker_1.faker.person.fullName(),
    Int: () => faker_1.faker.number.int({ min: 1, max: 100 }),
    Float: () => faker_1.faker.number.float({ min: 0, max: 100, fractionDigits: 2 }),
    Boolean: () => faker_1.faker.datatype.boolean(),
    DateTime: () => faker_1.faker.date.past().toISOString(),
};
// Generate mock data for a field
function generateField(fieldOrType, fieldName = null) {
    // Handle both field object and type string
    let field;
    let type;
    let isId = false;
    // let isUnique: boolean = false; // Unused variable
    if (typeof fieldOrType === 'object') {
        field = fieldOrType;
        type = field.type;
        isId = field.isId;
        // isUnique = field.isUnique; // Unused variable
        fieldName = field.name;
    }
    else {
        type = fieldOrType;
    }
    // Handle ID fields
    if (isId) {
        return faker_1.faker.string.uuid();
    }
    // Handle field names first (more specific)
    if (fieldName) {
        const fieldNameGen = fieldNameGenerators[fieldName.toLowerCase()];
        if (fieldNameGen) {
            return fieldNameGen();
        }
    }
    // Handle by type (fallback)
    const baseType = type.replace(/\[\]$/, "");
    const typeGen = typeGenerators[baseType];
    if (typeGen) {
        return typeGen();
    }
    return null;
}
