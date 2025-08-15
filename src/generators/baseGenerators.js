const { faker } = require("@faker-js/faker");

// Smart field name detection
const fieldNameGenerators = {
  // Email fields
  email: () => faker.internet.email(),
  
  // Name fields
  name: () => faker.person.fullName(),
  title: () => faker.lorem.sentence({ min: 3, max: 8 }),
  
  // Content fields
  content: () => faker.lorem.paragraphs({ min: 1, max: 3 }),
  bio: () => faker.lorem.paragraph({ min: 10, max: 50 }),
  
  // ID fields (should be UUIDs)
  id: () => faker.string.uuid(),
  
  // Foreign key fields (should be UUIDs)
  userId: () => faker.string.uuid(),
  authorId: () => faker.string.uuid(),
  postId: () => faker.string.uuid(),
  companyId: () => faker.string.uuid(),
};

// Type-based generators (fallback)
const typeGenerators = {
  String: () => faker.person.fullName(),
  Int: () => faker.number.int({ min: 1, max: 100 }),
  Float: () => faker.number.float({ min: 0, max: 100, precision: 0.01 }),
  Boolean: () => faker.datatype.boolean(),
  DateTime: () => faker.date.past().toISOString(),
};

// Generate mock data for a field
function generateField(fieldOrType, fieldName = null) {
  // Handle both field object and type string
  let field, type, isId, isUnique;
  
  if (typeof fieldOrType === 'object') {
    field = fieldOrType;
    type = field.type;
    isId = field.isId;
    isUnique = field.isUnique;
    fieldName = field.name;
  } else {
    type = fieldOrType;
  }
  
  // Handle ID fields
  if (isId) {
    return faker.string.uuid();
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

module.exports = { generateField };