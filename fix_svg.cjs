const fs = require('fs');
let code = fs.readFileSync('src/components/ChromatogramSvg.tsx', 'utf8');

// Fix Y ticks to point inward
code = code.replace(/<line\s+x1=\{m\.l - 4\}\s+y1=\{yy\}\s+x2=\{m\.l\}\s+y2=\{yy\}\s+stroke="#000000"\s+strokeWidth="0\.6"\s+\/>/g, '<line\n              x1={m.l}\n              y1={yy}\n              x2={m.l + 4}\n              y2={yy}\n              stroke="#000000"\n              strokeWidth="0.8"\n            />');

// Fix Y tick formatting
code = code.replace(/\{v >= 1000 \|\| v <= -1000 \? v\.toLocaleString\(undefined, \{maximumFractionDigits: 0\}\) : v\.toFixed\(1\)\}/g, '{v === 0 ? "0.0" : v.toLocaleString("en-US", {minimumFractionDigits: 0, maximumFractionDigits: 0})}');

// Fix X ticks to point inward
code = code.replace(/<line\s+x1=\{xx\}\s+y1=\{m\.t \+ ph\}\s+x2=\{xx\}\s+y2=\{m\.t \+ ph \+ 4\}\s+stroke="#000000"\s+strokeWidth="0\.6"\s+\/>/g, '<line\n              x1={xx}\n              y1={m.t + ph - 4}\n              x2={xx}\n              y2={m.t + ph}\n              stroke="#000000"\n              strokeWidth="0.8"\n            />');

fs.writeFileSync('src/components/ChromatogramSvg.tsx', code);
