module.exports = {
  name: 'User',
  fields: [
    { name: 'id', isId: true, isRelation: false, isScalar: true, type: 'String' },
    { name: 'name', isRelation: false, isScalar: true, type: 'String' },
    { name: 'email', isRelation: false, isScalar: true, type: 'String' },
    { name: 'posts', isRelation: true, isArray: true, type: 'Post' },
  ],
};
