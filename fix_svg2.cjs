const fs = require('fs');
let code = fs.readFileSync('src/components/ChromatogramSvg.tsx', 'utf8');

// Fix Y ticks to point outward
code = code.replace(/<line\n\s+x1=\{m\.l\}\n\s+y1=\{yy\}\n\s+x2=\{m\.l \+ 4\}\n\s+y2=\{yy\}\n\s+stroke="#000000"\n\s+strokeWidth="0\.8"\n\s+\/>/g, '<line\n              x1={m.l - 4}\n              y1={yy}\n              x2={m.l}\n              y2={yy}\n              stroke="#000000"\n              strokeWidth="0.6"\n            />');

// Fix X ticks to point outward
code = code.replace(/<line\n\s+x1=\{xx\}\n\s+y1=\{m\.t \+ ph - 4\}\n\s+x2=\{xx\}\n\s+y2=\{m\.t \+ ph\}\n\s+stroke="#000000"\n\s+strokeWidth="0\.8"\n\s+\/>/g, '<line\n              x1={xx}\n              y1={m.t + ph}\n              x2={xx}\n              y2={m.t + ph + 4}\n              stroke="#000000"\n              strokeWidth="0.6"\n            />');

fs.writeFileSync('src/components/ChromatogramSvg.tsx', code);
