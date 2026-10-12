const fs = require('fs');
let code = fs.readFileSync('src/components/LabSolutionsReport.tsx', 'utf8');

// Replace <span>Report(Report Editor)</span> with <span>Data Report</span> or empty
code = code.replace(/<span>Report\(Report Editor\)<\/span>/g, '<span></span>');
code = code.replace(/Report\(Report Editor\)/g, '');

fs.writeFileSync('src/components/LabSolutionsReport.tsx', code);
