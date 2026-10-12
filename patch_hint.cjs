const fs = require('fs');
let code = fs.readFileSync('src/components/ReportHeaderCard.tsx', 'utf8');

code = code.replace(/\{header\.baseName\} \{header\.compound\}/g, '{header.baseName} 01.lcd');
fs.writeFileSync('src/components/ReportHeaderCard.tsx', code);
