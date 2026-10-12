const fs = require('fs');
let code = fs.readFileSync('src/components/ReportHeaderCard.tsx', 'utf8');

code = code.replace(/Row title formatted as: <span className="font-mono text-slate-600">\{header\.baseName\} 01\.lcd<\/span>/g, 'Row title formatted as: <span className="font-mono text-slate-600">{header.baseName} {header.compound}</span>');

fs.writeFileSync('src/components/ReportHeaderCard.tsx', code);
