import { readFileSync, writeFileSync } from 'node:fs';

const deployJsonPath = process.argv[2];
const outPath = process.argv[3];
const payload = JSON.parse(readFileSync(deployJsonPath, 'utf8'));

const args = {
  project_id: payload.project_id,
  name: payload.name,
  entrypoint_path: payload.entrypoint_path,
  verify_jwt: payload.verify_jwt,
  files: payload.files,
};

// Store args for MCP invocation; agent reads and calls deploy_edge_function
writeFileSync(outPath, JSON.stringify(args), 'utf8');
