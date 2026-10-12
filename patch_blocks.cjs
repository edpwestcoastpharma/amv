const fs = require('fs');
let code = fs.readFileSync('src/components/DataBlocks.tsx', 'utf8');
code = code.replace(/const conflicts = amvSource\?\.conflicts \|\| \[\];/g, 'const conflicts = amvSource?.conflicts || [];');
code = code.replace(/const missing = amvSource\?\.missing \|\| \[\];/g, 'const missing = amvSource?.missing || [];');
// Make sure amvSource exists at all
code = code.replace(/\{ amvSource \}/g, '{ amvSource }');
fs.writeFileSync('src/components/DataBlocks.tsx', code);
