import { readFileSync, writeFileSync } from 'node:fs';

const src = process.argv[2];
const dest = process.argv[3];
writeFileSync(dest, readFileSync(src, 'utf8'), 'utf8');
console.log('copied', dest);
