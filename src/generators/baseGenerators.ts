import { getLocalizedFaker } from '../utils/localeManager';
import type { Field } from '../types';

// Smart field name detection
const fieldNameGenerators: Record<string, () => string> = {
  // Email fields - will be generated consistently with name in generateMockData
  email: () => getLocalizedFaker().internet.email(),
  
  // Name fields
  name: () => getLocalizedFaker().person.fullName(),
  title: () => getLocalizedFaker().lorem.sentence({ min: 3, max: 8 }),
  
  // Content fields
  content: () => getLocalizedFaker().lorem.paragraphs({ min: 1, max: 3 }),
  bio: () => getLocalizedFaker().lorem.paragraph({ min: 10, max: 50 }),
  
  // ID fields (should be UUIDs)
  id: () => getLocalizedFaker().string.uuid(),
  
  // Foreign key fields (should be UUIDs)
  userId: () => getLocalizedFaker().string.uuid(),
  authorId: () => getLocalizedFaker().string.uuid(),
  postId: () => getLocalizedFaker().string.uuid(),
  companyId: () => getLocalizedFaker().string.uuid(),
};

// Type-based generators (fallback)
const typeGenerators: Record<string, () => any> = {
  String: () => getLocalizedFaker().person.fullName(),
  Int: () => getLocalizedFaker().number.int({ min: 1, max: 100 }),
  Float: () => getLocalizedFaker().number.float({ min: 0, max: 100, fractionDigits: 2 }),
  Boolean: () => getLocalizedFaker().datatype.boolean(),
  DateTime: () => getLocalizedFaker().date.past().toISOString(),
};

// Generate mock data for a field
export function generateField(fieldOrType: Field | string, fieldName: string | null = null): any {
  // Handle both field object and type string
  let field: Field | undefined;
  let type: string;
  let isId: boolean = false;
  // let isUnique: boolean = false; // Unused variable
  
  if (typeof fieldOrType === 'object') {
    field = fieldOrType;
    type = field.type;
    isId = field.isId;
    // isUnique = field.isUnique; // Unused variable
    fieldName = field.name;
  } else {
    type = fieldOrType;
  }
  
  // Handle ID fields
  if (isId) {
    return getLocalizedFaker().string.uuid();
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
