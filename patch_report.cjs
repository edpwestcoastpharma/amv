const fs = require('fs');
let code = fs.readFileSync('src/components/LabSolutionsReport.tsx', 'utf8');

// import the blocks
const imports = `import { ValidationChecklist } from "./ValidationChecklist";
import { ConflictsDetected, MissingData, TraceabilityTable } from "./DataBlocks";
`;

code = code.replace(/import React, \{ useState, useRef \} from "react";\n/, `import React, { useState, useRef } from "react";\n${imports}`);

// inject before chromatograms
const beforeChrom = `
        {/* Validation Output Page (Before Chromatograms) */}
        {showValidationSummary && amvSource && (
          <div className="w-[210mm] min-h-[297mm] bg-white mx-auto shadow-sm print:shadow-none print:m-0 relative box-border overflow-hidden p-[10mm]">
            <ValidationChecklist groups={groups} amvSource={amvSource} />
            <ConflictsDetected amvSource={amvSource} />
            <MissingData amvSource={amvSource} />
          </div>
        )}
`;

code = code.replace(/<div className="bg-slate-200 print:bg-white min-h-screen py-8 print:py-0 font-sans flex flex-col items-center gap-8 print:gap-0">\n/, `<div className="bg-slate-200 print:bg-white min-h-screen py-8 print:py-0 font-sans flex flex-col items-center gap-8 print:gap-0">\n${beforeChrom}`);

// inject after chromatograms
const afterChrom = `
        {/* Traceability Page (After all) */}
        {showValidationSummary && amvSource && (
          <div className="w-[210mm] min-h-[297mm] bg-white mx-auto shadow-sm print:shadow-none print:m-0 relative box-border overflow-hidden p-[10mm]">
            <TraceabilityTable groups={groups} />
          </div>
        )}
`;

code = code.replace(/        \{\/\* 2\. Standard Data Pages \*\/\}/, `        {/* 2. Standard Data Pages */}`);
code = code.replace(/      <\/div>\n    <\/div>\n  \);\n\};\n/, `${afterChrom}      </div>\n    </div>\n  );\n};\n`);

fs.writeFileSync('src/components/LabSolutionsReport.tsx', code);
