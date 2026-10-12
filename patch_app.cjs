const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const rep = `    setHeader((prev) => ({
      ...prev,
      compound: extracted.product?.name || prev.compound,
      baseName: \`AMV_Report_\${(extracted.product?.name || "Compound").replace(/[^a-zA-Z0-9]/g, "_")}_HPLC\`,
    }));`;
code = code.replace(/    setHeader\(\(prev\) => \(\{\n      \.\.\.prev,\n      compound: extracted\.product\?\.name \|\| prev\.compound,\n    \}\)\);/g, rep);
fs.writeFileSync('src/App.tsx', code);
