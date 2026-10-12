const fs = require('fs');
let code = fs.readFileSync('src/components/LabSolutionsReport.tsx', 'utf8');

// Replace Top Page 1 of X
code = code.replace(/<td style=\{\{ textAlign: "right", border: "none", padding: 0 \}\}>Page 1 of \{totalPages\}<\/td>/g, '<td style={{ textAlign: "right", border: "none", padding: 0 }}></td>');

// Replace bottom Page X / Y
code = code.replace(/Page \{pageNum\} \/ \{totalPages\}/g, '');

fs.writeFileSync('src/components/LabSolutionsReport.tsx', code);
