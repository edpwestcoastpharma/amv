const fs = require('fs');
let code = fs.readFileSync('src/components/ChromatogramSvg.tsx', 'utf8');

code = code.replace(/const labelY = m\.t \+ ph \* 0\.48;/g, 'const labelY = Math.min(Y(apexY) - 5, m.t + ph * 0.95);');

// Actually wait, if the text goes UP, and the peak is very high, labelY shouldn't be less than the text length.
// But we don't know the text length. Let's just use a fixed labelY relative to apex, but bounded so it doesn't go below the X axis.
code = code.replace(/const labelY = Math\.min\(Y\(apexY\) - 5, m\.t \+ ph \* 0\.95\);/g, 'const labelY = Y(apexY) > m.t + 50 ? Y(apexY) - 5 : m.t + 50;');

fs.writeFileSync('src/components/ChromatogramSvg.tsx', code);
