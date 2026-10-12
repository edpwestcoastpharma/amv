const fs = require('fs');
let code = fs.readFileSync('src/utils/calculations.ts', 'utf8');

const replacement = `export function getFixedTrace(inj: InjectionData, maxX: number = 30): [number, number][] {
  if (inj._trace && inj._trace.length > 0) {
    const pts = inj._trace;
    const first = pts[0];
    const last = pts[pts.length - 1];
    return [
      [0, -1.0],
      [first[0], -1.0],
      ...pts,
      [last[0], -1.0],
      [maxX, -1.0]
    ];
  }
  
  // if not generated, fallback to a flat line
  return [
    [0, -1.0],
    [maxX, -1.0]
  ];
}`;

code = code.replace(/export function getFixedTrace[\s\S]*?return pts;\n\}/g, replacement);
fs.writeFileSync('src/utils/calculations.ts', code);
