const fs = require('fs');
let code = fs.readFileSync('src/utils/calculations.ts', 'utf8');

// We will inject _traceability into every injection.
// Let's replace the group generation blocks one by one to add _traceability.
code = code.replace(/id: \`sst_\$\{i\}\`,/g, 'id: `sst_${i}`, _traceability: { rule: "R1", sourceSection: "System Suitability" },');
code = code.replace(/id: "spec_1",/g, 'id: "spec_1", _traceability: { rule: "R7", sourceSection: "Specificity" },');
code = code.replace(/id: "spec_2",/g, 'id: "spec_2", _traceability: { rule: "R7", sourceSection: "Specificity" },');
code = code.replace(/id: "spec_3",/g, 'id: "spec_3", _traceability: { rule: "R1", sourceSection: "Specificity (Standard)" },');
code = code.replace(/id: "spec_4",/g, 'id: "spec_4", _traceability: { rule: "R1", sourceSection: "Specificity (Sample)" },');
code = code.replace(/id: \`spec_deg_\$\{i\}\`,/g, 'id: `spec_deg_${i}`, _traceability: { rule: "R5", sourceSection: "Forced Degradation" },');
code = code.replace(/id: \`spec_deg_imp_\$\{i\}\`,/g, 'id: `spec_deg_imp_${i}`, _traceability: { rule: "R5", sourceSection: "Forced Degradation" },');
code = code.replace(/id: \`lin_\$\{i\}\`,/g, 'id: `lin_${i}`, _traceability: { rule: "R1", sourceSection: "Linearity and Range" },');
code = code.replace(/id: \`acc_\$\{i\}\`,/g, 'id: `acc_${i}`, _traceability: { rule: "R3", sourceSection: "Accuracy / Recovery" },');
code = code.replace(/id: \`mp_\$\{i\}\`,/g, 'id: `mp_${i}`, _traceability: { rule: "R2", sourceSection: "Method Precision" },');
code = code.replace(/id: \`ip_\$\{i\}\`,/g, 'id: `ip_${i}`, _traceability: { rule: "R2", sourceSection: "Intermediate Precision" },');
code = code.replace(/id: \`rob_\$\{i\}_\$\{j\}\`,/g, 'id: `rob_${i}_${j}`, _traceability: { rule: "R6", sourceSection: "Robustness" },');
code = code.replace(/id: \`stab_\$\{i\}\`,/g, 'id: `stab_${i}`, _traceability: { rule: "R5", sourceSection: "Solution Stability" },');

fs.writeFileSync('src/utils/calculations.ts', code);
