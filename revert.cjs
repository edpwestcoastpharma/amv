const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

// Remove originalCanvases to catch(e) {} } block
code = code.replace(/const originalCanvases = Array\.from\(container\.querySelectorAll\("canvas"\)\);[\s\S]*?\} catch\(e\) \{\}\s*\}/, '');

fs.writeFileSync('src/App.tsx', code);
