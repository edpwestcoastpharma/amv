const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldPrompt = `- CRITICAL: For tables that contain multiple injections, replicates, or levels (e.g., System Suitability usually has 5-6 replicates, Accuracy usually has 9 injections across 3 levels, Precision usually has 6 preparations), YOU MUST EXTRACT EVERY SINGLE ROW. Do NOT summarize or extract only the first row.`;

const newPrompt = `- CRITICAL: For tables that contain multiple injections, replicates, or levels (e.g., System Suitability usually has 5-6 replicates, Accuracy usually has 9 injections across 3 levels, Precision usually has 6 preparations), YOU MUST EXTRACT EVERY SINGLE ROW. Do NOT summarize or extract only the first row. If the table has 6 rows, you must output an array of 6 items.`;

code = code.replace(oldPrompt, newPrompt);
fs.writeFileSync('server.ts', code);
