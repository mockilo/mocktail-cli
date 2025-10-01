import { exportToJson } from './exportToJson';

export function exportMockData(format: string, data: Record<string, any>[], modelName: string, outputPath: string): void {
  switch (format) {
    case 'json':
    default:
      exportToJson(data, modelName, outputPath);
      break;
  }
}
