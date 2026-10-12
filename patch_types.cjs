const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

code = code.replace(/  stability:/g, '  hasSpecificity?: boolean;\n  stability:');

fs.writeFileSync('src/types.ts', code);
