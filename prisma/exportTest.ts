// examples/exportTest.ts
import { generateMockData } from '../src/generators/generateMockData';
import { exportMockData } from '../src/exporters';
import type { Model } from '../src/types';

const userModel: Model = {
  name: 'User',
  modelLevelUniques: [],
  fields: [
    { name: 'id', type: 'String', rawType: 'String', isId: true, isArray: false, isOptional: false, isScalar: true, isRelation: false, isUnique: false, hasDefault: false },
    { name: 'email', type: 'String', rawType: 'String', isArray: false, isOptional: false, isScalar: true, isRelation: false, isId: false, isUnique: false, hasDefault: false },
    { name: 'name', type: 'String', rawType: 'String', isArray: false, isOptional: false, isScalar: true, isRelation: false, isId: false, isUnique: false, hasDefault: false },
    { name: 'role', type: 'String', rawType: 'String', isArray: false, isOptional: false, isScalar: true, isRelation: false, isId: false, isUnique: false, hasDefault: false },
  ],
};

const mock = generateMockData(userModel, { count: 3 });

exportMockData('json', mock.records, userModel.name, './mock-output');
