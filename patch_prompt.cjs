const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldPrompt = `    const promptText = \`Extract data from this Analytical Method Validation (AMV) report according to the following schema strictly.
- Prefer values printed in results tables over values in narrative method text. Compendial monograph text is often pasted into the method section and contains values belonging to a different method.
- If two different values exist for the same field, record both in conflicts, use the table value.
- Any field that cannot be found goes into missing. Never guess.
- degradation is null if the report has no forced degradation table. Do not invent degradation data.\`;`;

const newPrompt = `    const promptText = \`Extract data from this Analytical Method Validation (AMV) report according to the following schema strictly.
- Prefer values printed in results tables over values in narrative method text. Compendial monograph text is often pasted into the method section and contains values belonging to a different method.
- If two different values exist for the same field, record both in conflicts, use the table value.
- Any field that cannot be found goes into missing. Never guess.
- IMPORTANT: If a table or section (like Linearity, Accuracy, Precision, Robustness, Stability) is completely MISSING from the AMV report, you MUST return an empty array [] for that field. DO NOT invent, hallucinate, or carry over data.
- degradation is null if the report has no forced degradation table. Do not invent degradation data.\`;`;

code = code.replace(oldPrompt, newPrompt);
fs.writeFileSync('server.ts', code);
