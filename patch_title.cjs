const fs = require('fs');
let code = fs.readFileSync('src/components/LabSolutionsReport.tsx', 'utf8');

code = code.replace(/\{header\.baseName\} \{header\.compound\}/g, '{header.baseName} {inj.no}.lcd');
fs.writeFileSync('src/components/LabSolutionsReport.tsx', code);
