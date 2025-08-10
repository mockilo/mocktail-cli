const { faker } = require("@faker-js/faker");

// Map Prisma types to generator functions
const generators = {
  String: () => faker.person.fullName(),            // random full name
  Int: () => faker.number.int({ min: 1, max: 100 }), // random integer 1-100
  Float: () => faker.number.float({ min: 0, max: 100, precision: 0.01 }),
  Boolean: () => faker.datatype.boolean(),
  DateTime: () => faker.date.past().toISOString(),
  // Add more types as needed
};

// Generate mock data for a field type
function generateField(type) {
  // Remove [] if it's an array type like Post[]
  const baseType = type.replace(/\[\]$/, "");

  const gen = generators[baseType];
  if (gen) return gen();

  // Default fallback if unknown type
  return null;
}

module.exports = { generateField };
