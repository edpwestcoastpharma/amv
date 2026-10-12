const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/scale: highQuality \? 1\.15 : 1\.0,/, 'scale: 1.15,');
code = code.replace(/concurrency: highQuality \? 2 : 3,/, 'concurrency: 2,');

fs.writeFileSync('src/App.tsx', code);
