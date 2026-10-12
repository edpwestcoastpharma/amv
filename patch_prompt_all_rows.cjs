const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldPrompt = `- IMPORTANT: If a table or section (like Linearity, Accuracy, Precision, Robustness, Stability) is completely MISSING from the AMV report, you MUST return an empty array [] for that field. DO NOT invent, hallucinate, or carry over data.`;

const newPrompt = `- IMPORTANT: If a table or section (like Linearity, Accuracy, Precision, Robustness, Stability) is completely MISSING from the AMV report, you MUST return an empty array [] for that field. DO NOT invent, hallucinate, or carry over data.
- CRITICAL: For tables that contain multiple injections, replicates, or levels (e.g., System Suitability usually has 5-6 replicates, Accuracy usually has 9 injections across 3 levels, Precision usually has 6 preparations), YOU MUST EXTRACT EVERY SINGLE ROW. Do NOT summarize or extract only the first row.`;

code = code.replace(oldPrompt, newPrompt);
fs.writeFileSync('server.ts', code);
