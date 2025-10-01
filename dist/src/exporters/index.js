"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportMockData = exportMockData;
const exportToJson_1 = require("./exportToJson");
function exportMockData(format, data, modelName, outputPath) {
    switch (format) {
        case 'json':
        default:
            (0, exportToJson_1.exportToJson)(data, modelName, outputPath);
            break;
    }
}
