const fs = require('fs');
let code = fs.readFileSync('src/components/LabSolutionsReport.tsx', 'utf8');

code = code.replace(/\{header\.baseName\} \{inj\.no\}\.lcd/g, '{header.baseName} {header.compound}');

fs.writeFileSync('src/components/LabSolutionsReport.tsx', code);
