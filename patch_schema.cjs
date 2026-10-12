const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/    stability: \{/g, '    hasSpecificity: { type: Type.BOOLEAN, description: "True if the report has a Specificity or Selectivity section, false otherwise." },\n    stability: {');

code = code.replace(/"robustness", "stability",/g, '"robustness", "stability", "hasSpecificity",');

fs.writeFileSync('server.ts', code);
