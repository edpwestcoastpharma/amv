const fs = require('fs');
let code = fs.readFileSync('src/utils/calculations.ts', 'utf8');

const rsdFunc = `
function generateAreasForRsd(n: number, mean: number, targetRsdPct: number): number[] {
  if (n <= 1 || targetRsdPct === 0) return Array(n).fill(Math.round(mean));
  const targetSd = mean * targetRsdPct / 100;
  const base = [];
  for (let i = 0; i < n; i++) {
    base.push(i - (n - 1) / 2);
  }
  const baseVar = base.reduce((a, b) => a + b * b, 0) / (n - 1);
  const baseSd = Math.sqrt(baseVar);
  const scale = targetSd / baseSd;
  return base.map(x => Math.round(mean + x * scale));
}

function seededDrift(seedStr: string, maxDrift: number): number {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = Math.imul(31, hash) + seedStr.charCodeAt(i) | 0;
  }
  const random = (Math.abs(hash) % 1000) / 1000;
  return maxDrift * (random * 2 - 1);
}
`;

code = code.replace('export function processAmvSource', rsdFunc + '\nexport function processAmvSource');

fs.writeFileSync('src/utils/calculations.ts', code);
