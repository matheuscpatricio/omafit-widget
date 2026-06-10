import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const deployJsonPath = process.argv[2];
const outPath = process.argv[3];
const root = process.argv[4];

const payload = JSON.parse(readFileSync(deployJsonPath, 'utf8'));
const files = payload.files.map((file) => {
  const diskPath = join(root, file.name.replace(/\//g, '\\'));
  const content = readFileSync(diskPath, 'utf8').replace(/\r?\n/g, '\r\n');
  return { name: file.name, content };
});

const args = {
  project_id: payload.project_id,
  name: payload.name,
  entrypoint_path: payload.entrypoint_path,
  verify_jwt: payload.verify_jwt,
  files,
};

writeFileSync(outPath, JSON.stringify(args), 'utf8');
console.log('built', args.name, files.length);
