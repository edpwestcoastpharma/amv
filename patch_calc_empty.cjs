const fs = require('fs');
let code = fs.readFileSync('src/utils/calculations.ts', 'utf8');

// Ensure that we only push groups if they actually have injections
code = code.replace(/groups\.push\(\{ id: "grp_sst", name: "System Suitability", injections: ssInjections \}\);/g, 'if (ssInjections.length > 0) groups.push({ id: "grp_sst", name: "System Suitability", injections: ssInjections });');

code = code.replace(/groups\.push\(\{ id: "grp_spec", name: "Specificity & Degradation", injections: specInjections \}\);/g, 'if (specInjections.length > 0) groups.push({ id: "grp_spec", name: "Specificity & Degradation", injections: specInjections });');

code = code.replace(/groups\.push\(\{ id: "grp_lin", name: "Linearity & Range", injections: linInjections \}\);/g, 'if (linInjections.length > 0) groups.push({ id: "grp_lin", name: "Linearity & Range", injections: linInjections });');

code = code.replace(/groups\.push\(\{ id: "grp_acc", name: "Accuracy & Recovery", injections: accInjections \}\);/g, 'if (accInjections.length > 0) groups.push({ id: "grp_acc", name: "Accuracy & Recovery", injections: accInjections });');

code = code.replace(/groups\.push\(\{ id: "grp_mp", name: "Method Precision", injections: mpInjections \}\);/g, 'if (mpInjections.length > 0) groups.push({ id: "grp_mp", name: "Method Precision", injections: mpInjections });');

code = code.replace(/groups\.push\(\{ id: "grp_ip", name: "Intermediate Precision", injections: ipInjections \}\);/g, 'if (ipInjections.length > 0) groups.push({ id: "grp_ip", name: "Intermediate Precision", injections: ipInjections });');

code = code.replace(/groups\.push\(\{ id: "grp_rob", name: "Robustness", injections: robInjections \}\);/g, 'if (robInjections.length > 0) groups.push({ id: "grp_rob", name: "Robustness", injections: robInjections });');

code = code.replace(/groups\.push\(\{ id: "grp_stab", name: "Solution Stability", injections: stabInjections \}\);/g, 'if (stabInjections.length > 0) groups.push({ id: "grp_stab", name: "Solution Stability", injections: stabInjections });');

fs.writeFileSync('src/utils/calculations.ts', code);
