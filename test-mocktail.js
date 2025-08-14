const { generateMockData } = require('./src/generators/generateMockData');
const { formatToSQL, formatJoinTableSQL } = require('./src/utils/formatToSQL');


// Define a simple User model descriptor for testing
const UserModel = {
  name: 'User',
  fields: [
    { name: 'id', type: 'String', isId: true, isScalar: true },
    { name: 'name', type: 'String', isScalar: true },
    { name: 'email', type: 'String', isScalar: true },
    { name: 'jah', isRelation: true, isArray: true },
    { name: 'favoritePosts', isRelation: true, isArray: true }
  ],
};

const relatedPostIds = ['post1', 'post2', 'post3'];

const { records, joinTableRecords } = generateMockData(UserModel, {
  count: 5,
  relationData: {
    jah: relatedPostIds,
    favoritePosts: relatedPostIds,
  },
  config: { sqlMode: true },
});
console.log('Raw records:', records);

const userSQL = formatToSQL('User', records, UserModel.fields);
console.log('--- User Table SQL ---');
console.log(userSQL);

for (const [joinTableName, recs] of Object.entries(joinTableRecords)) {
  const joinSQL = formatJoinTableSQL(joinTableName, recs);
  console.log(`--- Join Table SQL: ${joinTableName} ---`);
  console.log(joinSQL);
  


}
