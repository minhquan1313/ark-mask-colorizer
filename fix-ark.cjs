// fix-ark.js
const fs = require('fs');
const p = 'src/utils/arkPalette.js';
let s = fs.readFileSync(p, 'utf8');
// thay các ký tự backslash + n thành newline thực
s = s.replace(/\\n/g, '\n');
fs.writeFileSync(p, s, 'utf8');
console.log('Fixed', p);
