const fs = require('fs');
let code = fs.readFileSync('src/components/ChromatogramSvg.tsx', 'utf8');

code = code.replace(/const labelY = m\.t \+ ph \* 0\.48;/g, 'const labelY = Math.max(m.t + 45, Y(apexY) - 5);');

// wait, the previous replace was `const labelY = Math.min(Y(apexY) - 5, m.t + ph * 0.95);`
// let's just replace the whole line if it's there
code = code.replace(/const labelY = .*/g, 'const labelY = Math.max(m.t + 45, Y(apexY) - 5);');

fs.writeFileSync('src/components/ChromatogramSvg.tsx', code);
