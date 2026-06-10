import { readFileSync, writeFileSync } from 'node:fs';

const src = process.argv[2];
const dest = process.argv[3];
const payload = JSON.parse(readFileSync(src, 'utf8'));
writeFileSync(
  dest,
  JSON.stringify({
    project_id: payload.project_id,
    name: payload.name,
    entrypoint_path: payload.entrypoint_path,
    verify_jwt: payload.verify_jwt,
    files: payload.files,
  }),
  'utf8',
);
