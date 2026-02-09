const fs = require('fs');
const path = 'assets/app.js';
const s = fs.readFileSync(path, 'utf8');
const lines = s.split('\n');
let c = 0;
for (let i = 0; i < lines.length; i++) {
    const n = (lines[i].match(/`/g) || []).length;
    if (n > 0) {
        c += n;
        console.log(`${i + 1}:${n}: cumulative=${c} (${c % 2 ? 'ODD' : 'EVEN'})  ${lines[i].slice(0, 300)}`);
    }
}
console.log('TOTAL_BACKTICKS=' + (s.split('`').length - 1));
