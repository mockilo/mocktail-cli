const fs = require('fs');
const path = require('path');

function exportToJson(data, modelName, outputPath = './mock-output') {
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }

  const fileName = `${modelName.toLowerCase()}.json`;
  const filePath = path.join(outputPath, fileName);

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

  console.log(`✅ Exported ${data.length} records to ${filePath}`);
}

module.exports = { exportToJson };
