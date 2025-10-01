import type { Model } from '../src/types';

const userModel: Model = {
  name: 'User',
  modelLevelUniques: [],
  fields: [
    { name: 'id', isId: true, isRelation: false, isScalar: true, type: 'String', rawType: 'String', isArray: false, isOptional: false, isUnique: false, hasDefault: false },
    { name: 'name', isRelation: false, isScalar: true, type: 'String', rawType: 'String', isArray: false, isOptional: false, isId: false, isUnique: false, hasDefault: false },
    { name: 'email', isRelation: false, isScalar: true, type: 'String', rawType: 'String', isArray: false, isOptional: false, isId: false, isUnique: false, hasDefault: false },
    { name: 'posts', isRelation: true, isArray: true, type: 'Post', rawType: 'Post[]', isOptional: false, isScalar: false, isId: false, isUnique: false, hasDefault: false },
  ],
};

export default userModel;
