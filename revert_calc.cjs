const fs = require('fs');
let code = fs.readFileSync('src/utils/calculations.ts', 'utf8');

// revert stats
code = code.replace(/export function stats[\s\S]*?\} return calculateStats\(arr\); \}/, 'export const stats = {\n  n: (arr: number[]) => {\n    return arr.filter((x) => x !== null && x !== undefined && x > 0).length;\n  },\n  avg: (arr: number[]) => {\n    const valid = arr.filter((x) => x !== null && x !== undefined && x > 0);\n    if (!valid.length) return 0;\n    const sum = valid.reduce((a, b) => a + b, 0);\n    return sum / valid.length;\n  },\n  rsd: (arr: number[]) => {\n    const valid = arr.filter((x) => x !== null && x !== undefined && x > 0);\n    if (valid.length < 2) return 0;\n    const sum = valid.reduce((a, b) => a + b, 0);\n    const avg = sum / valid.length;\n    const sd = Math.sqrt(\n      valid.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / (valid.length - 1)\n    );\n    return (sd / avg) * 100;\n  },\n};\n\nconst _oldstats = {');
code = code.replace(/const _oldstats = \{[\s\S]*?\};\n/, '');

// revert getFixedTrace
code = code.replace(/export function getFixedTrace[\s\S]*?\[maxX, -1\.0\]\n  \];\n\}/, 'export function getFixedTrace(inj: InjectionData, maxX: number = 30): [number, number][] {\n  if (inj._trace && inj._trace.length > 0) return inj._trace;\n  \n  // if not generated, fallback to a flat line\n  const pts: [number, number][] = [];\n  for (let t = 0; t <= maxX; t += 0.05) {\n    pts.push([parseFloat(t.toFixed(2)), -1.0]);\n  }\n  return pts;\n}');

// revert calculateRRT
code = code.replace(/export function calculateRRT\(rt: number, refRt: number, area\?: number\) \{ return \(rt \/ refRt\)\.toFixed\(3\); \}\nexport function calculateRRTBulk\(injections: InjectionData\[\], refRt: number\) \{/, 'export function calculateRRT(injections: InjectionData[], refRt: number) {');

// revert autoFillAllGroups and autoFillGroup
code = code.replace(/export function autoFillAllGroups\(groups: GroupData\[\]\) \{ return groups\.map\(g => autoFillGroup\(g\)\); \}\n/, '');
code = code.replace(/export function autoFillGroup\(group: GroupData\) \{[\s\S]*?return \{ \.\.\.group, injections: updatedInjections \};\n\}/, 'export function autoFillGroup(group: GroupData) {\n  return group;\n}');

fs.writeFileSync('src/utils/calculations.ts', code);
