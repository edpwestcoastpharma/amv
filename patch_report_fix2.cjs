const fs = require('fs');
let code = fs.readFileSync('src/components/LabSolutionsReport.tsx', 'utf8');

if (!code.includes('import { ConflictsDetected, MissingData, TraceabilityTable } from "./DataBlocks";')) {
    code = code.replace(/import \{ ValidationChecklist \} from "\.\/ValidationChecklist";/g, 'import { ValidationChecklist } from "./ValidationChecklist";\nimport { ConflictsDetected, MissingData, TraceabilityTable } from "./DataBlocks";');
}
fs.writeFileSync('src/components/LabSolutionsReport.tsx', code);
