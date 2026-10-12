const fs = require('fs');
let code = fs.readFileSync('src/utils/calculations.ts', 'utf8');

const specStart = `  // 2. Specificity
  let specInjections: InjectionData[] = [];
  if (source.hasSpecificity || (source.degradation && source.degradation.length > 0)) {
    specInjections = [
      {
        id: "spec_1", _traceability: { rule: "R7", sourceSection: "Specificity" }, no: "01", sampleName: "Diluent / Blank", sampleId: "BLK-01",
        rt: null, area: 0, height: 0, tailing: 0, plates: 0, areaPct: 0, resolution: "--", rrt: "--"
      },
      {
        id: "spec_2", _traceability: { rule: "R7", sourceSection: "Specificity" }, no: "02", sampleName: "Placebo", sampleId: "PLC-01",
        rt: null, area: 0, height: 0, tailing: 0, plates: 0, areaPct: 0, resolution: "--", rrt: "--"
      },
      {
        id: "spec_3", _traceability: { rule: "R1", sourceSection: "Specificity (Standard)" }, no: "03", sampleName: "Standard Solution (100%)", sampleId: "STD-100",
        rt: rt, area: stdArea, height: Math.round(peakHeight(stdArea, rt, basePlates)),
        tailing: baseTailing, plates: basePlates, areaPct: 100.0, resolution: "--", rrt: "1.000",
        _trace: generatePeakTrace(rt, Math.round(peakHeight(stdArea, rt, basePlates)), 0, baseTailing)
      },
      {
        id: "spec_4", _traceability: { rule: "R1", sourceSection: "Specificity (Sample)" }, no: "04", sampleName: "As-Is Sample", sampleId: "SPL-100",
        rt: rt, area: stdArea, height: Math.round(peakHeight(stdArea, rt, basePlates)),
        tailing: baseTailing, plates: basePlates, areaPct: 100.0, resolution: "--", rrt: "1.000",
        _trace: generatePeakTrace(rt, Math.round(peakHeight(stdArea, rt, basePlates)), 0, baseTailing)
      }
    ];
  }`;

// The original code was:
//   // 2. Specificity
//   const specInjections: InjectionData[] = [
//     { ... }, { ... }, { ... }, { ... }
//   ];

code = code.replace(/  \/\/ 2\. Specificity\n  const specInjections: InjectionData\[\] = \[\n    \{\n      id: "spec_1", [^]*?_trace: generatePeakTrace\(rt, Math\.round\(peakHeight\(stdArea, rt, basePlates\)\), 0, baseTailing\)\n    \}\n  \];/m, specStart);

fs.writeFileSync('src/utils/calculations.ts', code);
