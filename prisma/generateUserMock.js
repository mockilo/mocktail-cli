const { faker } = require('@faker-js/faker');
const { generateMockData } = require('../src/generators/generateMockData');

const userModel = {
  name: 'User',
  fields: [
    { name: 'id', type: 'String', isId: true },
    { name: 'email', type: 'String' },
    { name: 'name', type: 'String' },
    { name: 'role', type: 'String' },
    { name: 'profileId', type: 'String' },
    {
      name: 'profile',
      type: 'Profile',
      isRelation: true,
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
