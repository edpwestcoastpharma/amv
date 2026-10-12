const fs = require('fs');
let code = fs.readFileSync('src/utils/calculations.ts', 'utf8');

code = code.replace(/export function autoFillGroup\(group: GroupData\) \{/g, 'export function autoFillAllGroups(groups: GroupData[]) { return groups.map(g => autoFillGroup(g)); }\nexport function autoFillGroup(group: GroupData) {');

fs.writeFileSync('src/utils/calculations.ts', code);
