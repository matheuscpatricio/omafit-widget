# Self-hosted try-on — arquitetura

Serviço Python separado do SPA, versionado nesta pasta de propósito. Não foi movido para `services/inference/`: `docker-compose.yml`, volumes `./outputs` e `./weights`, e `docs/tryon/SELF_HOSTED_TRYON_DEPLOY.md` / `EC2_UBUNTU24_COMMANDS.md` usam o caminho `self-hosted-tryon/`.

Deploy operacional: [README.md](./README.md) e [docs/tryon/SELF_HOSTED_TRYON_DEPLOY.md](../docs/tryon/SELF_HOSTED_TRYON_DEPLOY.md).

## Papel

A Edge Function `supabase/functions/tryon` (e o status em `tryon-status`) escolhe o provider em `supabase/functions/_shared/tryon-provider.ts`:

- `TRYON_PROVIDER=fal` força fal.ai (`fal-ai/fashn/tryon/v1.6`).
- `TRYON_PROVIDER=self_hosted` (ou `self-hosted`) **ou** `SELF_HOSTED_TRYON_URL` preenchida seleciona este serviço.
- Sem os dois, o default do código é `fal`.

O widget não fala com esta API. Ele continua chamando `/functions/v1/tryon` e `/functions/v1/tryon-status/:id`. A função grava o id do job no mesmo campo que o fluxo fal usa (`fal_request_id` no contrato devolvido ao widget). Este serviço não substitui esse contrato.

## API

FastAPI em `app/main.py`.

| Método | Path | Auth |
| --- | --- | --- |
| `GET` | `/health` | nenhuma |
| `POST` | `/jobs` | `Authorization: Bearer <FASHN_TRYON_AUTH_TOKEN>` se o token estiver definido |
| `GET` | `/jobs/{jobId}` | igual |

`POST /jobs` aceita `person_image_url`, `garment_image_url`, `category` (`tops` / `bottoms` / `one-pieces`), `session_id`, `public_id`. Responde `job_id` e `status: queued`.

`GET /jobs/{jobId}` responde `queued` / `processing`, ou `completed` com `result_url` e `timings`, ou `failed` com `error`.

Arquivos estáticos de resultado local: `/outputs` montado a partir de `OUTPUTS_DIR`.

## Fila, worker, Redis

- Redis 7 (`docker-compose.yml`, serviço `redis`).
- Fila RQ, nome default `tryon` (`RQ_QUEUE_NAME`).
- `POST /jobs` faz `queue.enqueue(run_tryon_job, ...)`.
- Processo worker: `python3 -m app.run_worker` (`app/worker.py` roda o modelo).
- API e worker reservam 1 GPU NVIDIA no compose.

Modelo documentado no README: FASHN VTON v1.5, pesos em `WEIGHTS_DIR`. `NUM_TIMESTEPS` controla o passo de inferência (exemplo no `.env.example`: 18).

## Storage do resultado

`OUTPUT_STORAGE_BACKEND`:

| Valor | Comportamento |
| --- | --- |
| `local` | arquivo em `OUTPUTS_DIR`, URL sob `/outputs` |
| `supabase` | upload para `SUPABASE_OUTPUT_BUCKET` / `SUPABASE_OUTPUT_PREFIX` |
| `s3` | upload S3 (`S3_BUCKET_NAME`, região, chaves, prefixo) |

Implementação: `app/storage.py`.

## Docker

`Dockerfile` na raiz desta pasta. Compose sobe `redis`, `api`, `worker` e também `ar-eyewear-tripo`.

Esse quarto serviço **não** é o try-on de roupa. Ele consome a fila de GLB de óculos. O default do compose é `../../omafit/workers/ar-mesh-generate` (`OMAFIT_AR_WORKER_CONTEXT`). O README desta pasta também cita `omafit/workers/ar-eyewear-tripo` como caminho alternativo. Os dois nomes estão no material do repo; o valor que o compose usa sem override é `ar-mesh-generate`. Depende do clone do repo `omafit` ao lado deste. Separar o try-on para outro repositório tem de decidir se esse serviço AR vai junto ou fica no `omafit`.

## Variáveis

Nomes em `.env.example` (valores não documentados aqui):

`FASHN_TRYON_AUTH_TOKEN`, `REDIS_URL`, `RQ_QUEUE_NAME`, `HOST`, `PORT`, `PUBLIC_BASE_URL`, `OUTPUT_STORAGE_BACKEND`, `OUTPUTS_DIR`, `WEIGHTS_DIR`, `RQ_JOB_TIMEOUT`, `RQ_RESULT_TTL`, `NUM_TIMESTEPS`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_OUTPUT_BUCKET`, `SUPABASE_OUTPUT_PREFIX`, `S3_BUCKET_NAME`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_ENDPOINT_URL`, `S3_PUBLIC_BASE_URL`, `S3_OUTPUT_PREFIX`, `AR_EYEWEAR_WORKER_STUB`, `AR_EYEWEAR_POLL_SECONDS`, `OMAFIT_AR_WORKER_CONTEXT`.

Na Edge Function, os nomes correspondentes são `SELF_HOSTED_TRYON_URL`, `SELF_HOSTED_TRYON_TOKEN` e `TRYON_PROVIDER`. O token da função precisa ser o mesmo `FASHN_TRYON_AUTH_TOKEN` desta API. Não renomear nenhum dos dois lados sem um deploy coordenado.

## Extração futura: `omafit-inference`

Faz sentido como repositório próprio: runtime Python, GPU, Redis e pesos não são o frontend Netlify.

Não fazer agora. Além do path do compose, a função `tryon-provider.ts` e o bucket `tryon-images` / resultados self-hosted estão acoplados por URL e por env na Supabase, não por import de pasta. A extração é um corte de deploy (imagem, DNS, secrets), não um move de diretório.
