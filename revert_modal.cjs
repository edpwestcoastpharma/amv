const fs = require('fs');
let code = fs.readFileSync('src/components/PdfDownloadModal.tsx', 'utf8');

code = code.replace(/onStartDirectDownload: \(scope: PdfScopeOption, highQuality: boolean\) => Promise<void>;/, 'onStartDirectDownload: (scope: PdfScopeOption) => Promise<void>;');
code = code.replace(/const \[highQuality, setHighQuality\] = useState\(false\);\n/, '');
code = code.replace(/<div className="pt-1 flex items-center justify-between text-\[11px\] text-slate-600 border-t border-slate-200">[\s\S]*?<\/div>\n/, '');
code = code.replace(/onClick=\{.*?onStartDirectDownload\(scope, highQuality\).*?\}/, 'onClick={() => onStartDirectDownload(scope)}');

fs.writeFileSync('src/components/PdfDownloadModal.tsx', code);
