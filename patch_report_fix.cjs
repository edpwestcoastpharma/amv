const fs = require('fs');
let code = fs.readFileSync('src/components/LabSolutionsReport.tsx', 'utf8');

// The TraceabilityTable is missing from the imports because the previous patch might not have hit exactly.
if (!code.includes('import { TraceabilityTable }')) {
    code = code.replace(/import \{ ValidationChecklist \} from "\.\/ValidationChecklist";\nimport \{ ConflictsDetected, MissingData \} from "\.\/DataBlocks";/g, 'import { ValidationChecklist } from "./ValidationChecklist";\nimport { ConflictsDetected, MissingData, TraceabilityTable } from "./DataBlocks";');
}
fs.writeFileSync('src/components/LabSolutionsReport.tsx', code);
