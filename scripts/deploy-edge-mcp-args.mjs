import { readFileSync } from 'node:fs';

const payloadPath = process.argv[2];
const payload = JSON.parse(readFileSync(payloadPath, 'utf8'));
const args = {
  project_id: payload.project_id,
  name: payload.name,
  entrypoint_path: payload.entrypoint_path,
  verify_jwt: payload.verify_jwt,
  files: payload.files,
};

// Used by agent to feed deploy_edge_function MCP tool
console.log(JSON.stringify(args));
