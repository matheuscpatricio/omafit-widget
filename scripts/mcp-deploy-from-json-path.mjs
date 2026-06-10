import { readFileSync, writeFileSync } from 'node:fs';

const deployJsonPath = process.argv[2];
const resultPath = process.argv[3];
const payload = JSON.parse(readFileSync(deployJsonPath, 'utf8'));

const args = {
  project_id: payload.project_id,
  name: payload.name,
  entrypoint_path: payload.entrypoint_path,
  verify_jwt: payload.verify_jwt,
  files: payload.files,
};

writeFileSync(resultPath, JSON.stringify(args), 'utf8');
console.log(JSON.stringify({ ok: true, name: args.name, files: args.files.length, bytes: JSON.stringify(args).length }));
