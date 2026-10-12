const fs = require('fs');
let code = fs.readFileSync('src/utils/calculations.ts', 'utf8');

const replacement = `export function getFixedTrace(inj: InjectionData, maxX: number = 30): [number, number][] {
  // Always generate trace dynamically so it strictly matches the table (height, tailing, rt)
  if (inj.rt && inj.height && inj.height > 0) {
    const generated = generatePeakTrace(inj.rt, inj.height, 0, inj.tailing || 1.0);
    if (generated.length > 0) {
      const first = generated[0];
      const last = generated[generated.length - 1];
      return [
        [0, 0.0],
        [first[0], 0.0],
        ...generated,
        [last[0], 0.0],
        [maxX, 0.0]
      ];
    }
  }
  
  // if not generated or zero area/height, fallback to a flat line
  return [
    [0, 0.0],
    [maxX, 0.0]
  ];
}`;

code = code.replace(/export function getFixedTrace[\s\S]*?return \[\n\s+\[0, 0\.0\],\n\s+\[maxX, 0\.0\]\n\s+\];\n\}/g, replacement);
fs.writeFileSync('src/utils/calculations.ts', code);
