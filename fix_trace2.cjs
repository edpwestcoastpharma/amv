const fs = require('fs');
let code = fs.readFileSync('src/utils/calculations.ts', 'utf8');

// Update generatePeakTrace to use raw peakHeight and 0.0 baseline
code = code.replace(/const peak_mV = peakHeight \/ 1000;\n\s+const baseline = -1\.0;/g, 'const peak_uV = peakHeight;\n  const baseline = 0.0;');
code = code.replace(/const peak = peak_mV \* Math\.exp\(-0\.5 \* Math\.pow\(dtPeak \/ effectiveSigma, 2\)\);/g, 'const peak = peak_uV * Math.exp(-0.5 * Math.pow(dtPeak / effectiveSigma, 2));');

// Update getFixedTrace to use 0.0 baseline instead of -1.0
code = code.replace(/\[0, -1\.0\],/g, '[0, 0.0],');
code = code.replace(/\[first\[0\], -1\.0\],/g, '[first[0], 0.0],');
code = code.replace(/\[last\[0\], -1\.0\],/g, '[last[0], 0.0],');
code = code.replace(/\[maxX, -1\.0\]/g, '[maxX, 0.0]');

fs.writeFileSync('src/utils/calculations.ts', code);
