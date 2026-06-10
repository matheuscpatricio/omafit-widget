import { readFileSync } from 'node:fs';

const payload = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const args = {
  project_id: payload.project_id,
  name: payload.name,
  entrypoint_path: payload.entrypoint_path,
  verify_jwt: payload.verify_jwt,
  files: payload.files,
};

// Emit args for MCP deploy_edge_function
process.stdout.write(JSON.stringify({ tool: 'deploy_edge_function', arguments: args }));
