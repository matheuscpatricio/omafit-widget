/**
 * Emite o relatório markdown da prova de voz (mock) para docs/stylist/.
 * Não chama ElevenLabs nem expõe API keys.
 *
 * Uso: node scripts/emit-stylist-voice-proof.mjs
 * (requer vitest/tsx via import dinâmico do bundle de teste — aqui reimplementa
 *  a chamada através de child_process + fiche o artefacto a partir do último run)
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outMd = join(root, 'docs/stylist/VOICE_PROOF_LAST_RUN.md');

const run = spawnSync(
  'npx',
  [
    'vitest',
    'run',
    'src/features/stylist/voice/proof/runVoiceProof.test.ts',
    '--reporter=dot',
  ],
  { cwd: root, encoding: 'utf8', env: process.env }
);

const stamp = new Date().toISOString();
const body = `# AI Stylist Voice — último run da prova

Gerado por \`scripts/emit-stylist-voice-proof.mjs\` em ${stamp}.

## Exit code

\`${run.status}\`

## Output

\`\`\`
${(run.stdout || '') + (run.stderr || '')}
\`\`\`

## Gate

Arquitetura conversacional **não pronta** para integração no widget.
Ver \`docs/stylist/VOICE_FEASIBILITY_REPORT.md\`.

Não houve deploy. Não houve chamada à API ElevenLabs.
`;

mkdirSync(dirname(outMd), { recursive: true });
writeFileSync(outMd, body, 'utf8');
console.log(body);
process.exit(run.status === 0 ? 0 : run.status || 1);
