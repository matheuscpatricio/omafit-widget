import { readFileSync } from 'node:fs';

const args = JSON.parse(readFileSync(process.argv[2], 'utf8'));
process.stdout.write(JSON.stringify(args));
