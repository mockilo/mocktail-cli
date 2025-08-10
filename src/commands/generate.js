const { parsePrismaSchema } = require("../schema-parsers/prismaParser");
const { generateField } = require("../generators/baseGenerators");

function runGenerate({ schema, count }) {
  const models = parsePrismaSchema(schema);
  console.log("Parsed Models and Fields:");
  console.log(JSON.stringify(models, null, 2));
  console.log(`Generating ${count} records per model...\n`);

  count = parseInt(count, 10);

  for (const modelName in models) {
    console.log(`Model: ${modelName}`);
    for (let i = 0; i < count; i++) {
      const record = {};
      const fields = models[modelName];
      for (const fieldName in fields) {
        record[fieldName] = generateField(fields[fieldName]);
      }
      console.log(record);
    }
    console.log("----");
  }
}

module.exports = { runGenerate };
