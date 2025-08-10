// examples/exportTest.js
const { generateMockData } = require('../src/generators/generateMockData');
const { exportMockData } = require('../src/exporters');

const userModel = {
  name: 'User',
  fields: [
    { name: 'id', type: 'String', isId: true },
    { name: 'email', type: 'String' },
    { name: 'name', type: 'String' },
    { name: 'role', type: 'String' },
  ],
};

const mock = generateMockData(userModel, { count: 3 });

exportMockData('json', mock, userModel.name, './mock-output');
