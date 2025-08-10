const { exportToJson } = require('./exportToJson');

function exportMockData(format, data, modelName, outputPath) {
  switch (format) {
    case 'json':
    default:
      exportToJson(data, modelName, outputPath);
      break;
  }
}

module.exports = { exportMockData };
