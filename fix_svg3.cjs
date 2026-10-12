const fs = require('fs');
let code = fs.readFileSync('src/components/ChromatogramSvg.tsx', 'utf8');

code = code.replace(/Y\(-1\.0\)/g, 'Y(0.0)');

fs.writeFileSync('src/components/ChromatogramSvg.tsx', code);
