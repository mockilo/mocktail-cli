import { faker } from '@faker-js/faker';
import { generateMockData } from '../src/generators/generateMockData';
import type { Model } from '../src/types';

const userModel: Model = {
  name: 'User',
  modelLevelUniques: [],
  fields: [
    { name: 'id', type: 'String', rawType: 'String', isId: true, isArray: false, isOptional: false, isScalar: true, isRelation: false, isUnique: false, hasDefault: false },
    { name: 'email', type: 'String', rawType: 'String', isArray: false, isOptional: false, isScalar: true, isRelation: false, isId: false, isUnique: false, hasDefault: false },
    { name: 'name', type: 'String', rawType: 'String', isArray: false, isOptional: false, isScalar: true, isRelation: false, isId: false, isUnique: false, hasDefault: false },
    { name: 'role', type: 'String', rawType: 'String', isArray: false, isOptional: false, isScalar: true, isRelation: false, isId: false, isUnique: false, hasDefault: false },
    {
      name: 'profileId',
      type: 'String',
      rawType: 'String',
      isArray: false,
      isOptional: false,
      isScalar: true,
      isRelation: false,
      isId: false,
      isUnique: false,
      hasDefault: false,
    },
    {
      name: 'profile',
      type: 'Profile',
      rawType: 'Profile',
      isArray: false,
      isOptional: false,
      isScalar: false,
      isRelation: true,
      isId: false,
      isUnique: false,
      hasDefault: false,
      relationFromFields: ['profileId'],
    },
  ],
};

const mock = generateMockData(userModel, {
  count: 5,
  customFields: {
    role: () => faker.helpers.arrayElement(['admin', 'user', 'guest']),
  },
  relationData: {
    profile: ['abc123', 'def456'], // Simulated profile IDs
  },
});

console.log(JSON.stringify(mock, null, 2));
