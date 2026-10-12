const fs = require('fs');
let code = fs.readFileSync('src/utils/calculations.ts', 'utf8');

const sstPatch = `
  const rt = source.analyteRtMin || 5.0;
  const basePlates = (source.sst && source.sst.length > 0 && source.sst[0]?.plates) ? source.sst[0].plates : 60000;
  const baseTailing = (source.sst && source.sst.length > 0 && source.sst[0]?.tailing) ? source.sst[0].tailing : 1.0;
  
  // 1. System Suitability
  const ssInjections: InjectionData[] = (source.sst || []).map((s, i) => ({
`;

code = code.replace(/  const rt = source\.analyteRtMin;\n  const basePlates = source\.sst\[0\]\?\.plates \|\| 60000;\n  \n  \/\/ 1\. System Suitability\n  const ssInjections: InjectionData\[\] = source\.sst\.map\(\(s, i\) => \(\{/g, sstPatch.trim() + '\n');

const stdAreaPatch = `
  groups.push({ id: "grp_sst", name: "System Suitability", injections: ssInjections });
  
  // Safe base area
  let stdArea = 1000000;
  if (ssInjections.length > 0) {
    stdArea = ssInjections.reduce((a, b) => a + (b.area || 0), 0) / ssInjections.length;
  } else if (source.linearity && source.linearity.length > 0) {
    const l100 = source.linearity.find(l => l.levelPct === 100) || source.linearity[Math.floor(source.linearity.length / 2)];
    if (l100) stdArea = l100.meanArea;
  }
`;

code = code.replace(/  groups\.push\(\{ id: "grp_sst", name: "System Suitability", injections: ssInjections \}\);\n\n  const stdArea = ssInjections\.reduce\(\(a, b\) => a \+ \(b\.area \|\| 0\), 0\) \/ ssInjections\.length;/g, stdAreaPatch.trim());

// replace source.sst[0].tailing with baseTailing
code = code.replace(/source\.sst\[0\]\.tailing/g, 'baseTailing');

// ensure regression fallback if regression missing
code = code.replace(/Math\.round\(source\.regression\.slope \* conc \+ source\.regression\.intercept\)/g, 'Math.round(source.regression ? (source.regression.slope * conc + source.regression.intercept) : (stdArea * (conc / source.method.workingConcUgMl)))');

fs.writeFileSync('src/utils/calculations.ts', code);
