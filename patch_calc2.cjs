const fs = require('fs');
let code = fs.readFileSync('src/utils/calculations.ts', 'utf8');

// Fix SST random
code = code.replace(/Number\(\(rt \+ \(Math\.random\(\) \* 0\.06 - 0\.03\)\)\.toFixed\(3\)\)/g, 'Number((rt + seededDrift(s.area.toString() + i, 0.03)).toFixed(3))');

// Fix Intermediate Precision random
code = code.replace(/const ipRt = Number\(\(rt \+ \(Math\.random\(\) \* 0\.1 - 0\.05\)\)\.toFixed\(3\)\);/g, 'const ipRt = Number((rt + seededDrift(m.assayPct.toString() + i, 0.05)).toFixed(3));');

// Fix Robustness
const robReplacement = `
  const robInjections: InjectionData[] = [];
  source.robustness.forEach((r, i) => {
    let robRt = rt;
    let robMeanArea = stdArea;
    const lc = r.condition.toLowerCase();
    
    // Heuristics for flow
    if (lc.includes("flow")) {
      const match = lc.match(/([0-9.]+)\\s*ml/);
      if (match && source.method.flowRate) {
        const flow = parseFloat(match[1]);
        robRt = rt * (source.method.flowRate / flow);
        robMeanArea = stdArea * (source.method.flowRate / flow);
      } else if (lc.includes("-") || lc.includes("low")) {
        robRt = rt * 1.1; robMeanArea = stdArea * 1.1;
      } else if (lc.includes("+") || lc.includes("high")) {
        robRt = rt * 0.9; robMeanArea = stdArea * 0.9;
      }
    } 
    // Heuristics for temp
    else if (lc.includes("temp") || lc.includes("column") || lc.includes("°c")) {
      const match = lc.match(/([0-9.]+)\\s*°?c/);
      if (match && source.method.columnTempC) {
        const temp = parseFloat(match[1]);
        robRt = rt * (1 - 0.015 * (temp - source.method.columnTempC));
      } else if (lc.includes("-") || lc.includes("low")) {
        robRt = rt * (1 - 0.015 * (-5));
      } else if (lc.includes("+") || lc.includes("high")) {
        robRt = rt * (1 - 0.015 * (5));
      }
    }
    // Heuristics for pH
    else if (lc.includes("ph") || lc.includes("buffer")) {
      if (lc.includes("-") || lc.includes("low")) {
        robRt = rt * (1 + 0.05 * (-0.2));
      } else if (lc.includes("+") || lc.includes("high")) {
        robRt = rt * (1 + 0.05 * (0.2));
      }
    }

    const areas = generateAreasForRsd(r.n, robMeanArea, r.rsdPct);
    
    for (let j = 0; j < r.n; j++) {
      const area = areas[j];
      const injRt = Number((robRt + seededDrift(r.condition + j, 0.03)).toFixed(3));
      robInjections.push({
        id: \`rob_\${i}_\${j}\`, no: String(robInjections.length + 1).padStart(2, "0"), sampleName: \`\${r.condition} - Inj \${j+1}\`, sampleId: \`ROB-\${i}-\${j}\`,
        rt: injRt, area, height: Math.round(peakHeight(area, injRt, r.plates)),
        tailing: r.tailing, plates: r.plates, areaPct: 100.0, resolution: "--", rrt: "1.000",
        _trace: generatePeakTrace(injRt, Math.round(peakHeight(area, injRt, r.plates)), 0, r.tailing)
      });
    }
  });
`;

code = code.replace(/const robInjections: InjectionData\[\] = \[\];[\s\S]*?groups\.push\(\{ id: "grp_rob", name: "Robustness", injections: robInjections \}\);/, robReplacement.trim() + '\n  groups.push({ id: "grp_rob", name: "Robustness", injections: robInjections });');

fs.writeFileSync('src/utils/calculations.ts', code);
