import * as fs from 'fs';
import * as path from 'path';

export function exportToJson(data: Record<string, any>[], modelName: string, outputPath: string = './mock-output'): void {
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }

  const fileName = `${modelName.toLowerCase()}.json`;
  const filePath = path.join(outputPath, fileName);

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

  console.log(`✅ Exported ${data.length} records to ${filePath}`);
}
