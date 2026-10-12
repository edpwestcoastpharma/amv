import fs from 'fs';
const data = fs.readFileSync('src/components/DataBlocks.tsx', 'utf8');
console.log(data);
