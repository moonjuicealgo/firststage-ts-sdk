import fs from 'fs';
import path from 'path';

const filePath = path.resolve('./dist/generated/FirstStage.js');
let content = fs.readFileSync(filePath, 'utf8');

// Replace the bad subpath import
content = content.replace(
  /from ['"]@algorandfoundation\/algokit-utils\/app-client['"]/g,
  "from '@algorandfoundation/algokit-utils'"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Replaced bad import path in FirstStage.js');