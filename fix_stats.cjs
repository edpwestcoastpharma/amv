const fs = require('fs');
let code = fs.readFileSync('src/utils/calculations.ts', 'utf8');

const replacement = `export function stats(arr: any[], fullOutput?: boolean) {
  const valid = arr
    .map((x) => parseFloat(x))
    .filter((x) => !isNaN(x) && x > 0);
  
  const n = valid.length;
  if (n === 0) return { n: 0, avg: 0, rsd: 0, max: 0, min: 0, sd: 0 };
  
  const sum = valid.reduce((a, b) => a + b, 0);
  const avg = sum / n;
  
  const max = Math.max(...valid);
  const min = Math.min(...valid);
  
  if (n === 1) return { n, avg, rsd: 0, max, min, sd: 0 };
  
  const sumSq = valid.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0);
  const sd = Math.sqrt(sumSq / (n - 1));
  const rsd = (sd / avg) * 100;
  
  return { n, avg, rsd, max, min, sd };
}`;

code = code.replace(/export const stats = \{[\s\S]*?return \(sd \/ avg\) \* 100;\n  \},\n\};\n/g, replacement);
fs.writeFileSync('src/utils/calculations.ts', code);
