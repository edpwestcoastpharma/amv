const fs = require('fs');
let code = fs.readFileSync('src/components/GroupEditor.tsx', 'utf8');

code = code.replace(/    \/\/ Auto calculate RRT if rt is modified and rrt is not manually locked\n    if \(field === "rt" \|\| field === "area"\) \{\n      const refRt = 13.958;\n      if \(target.rt !== null && target.rt !== undefined && \(target.area \|\| 0\) > 0\) \{\n        target.rrt = calculateRRT\(target.rt, refRt, target.area\);\n      \} else if \(\(target.area \|\| 0\) === 0 \|\| \(target.rt \|\| 0\) === 0\) \{\n        target.rrt = "--";\n      \}\n    \}\n/g, '');

fs.writeFileSync('src/components/GroupEditor.tsx', code);
