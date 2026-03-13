# Self-hosted Try-On Deploy

Este documento descreve o deploy da stack self-hosted de try-on e a configuração necessária no Omafit para trocar o provider via feature flag.

Para os comandos completos da EC2 Ubuntu 24.04, veja também:

- `self-hosted-tryon/EC2_UBUNTU24_COMMANDS.md`

## 1. Infra da EC2

Instância alvo:

- `Ubuntu 24.04`
- `g5.xlarge`
- disco recomendado: `100 GB` ou mais

Checklist base:

1. Instalar driver NVIDIA.
2. Validar GPU com `nvidia-smi`.
3. Instalar Docker.
4. Instalar NVIDIA Container Toolkit.
5. Criar DNS público, ex. `tryon.omafit.co`.
6. Colocar Nginx ou ALB com HTTPS na frente.

## 2. Deploy da API self-hosted

Projeto:

- `self-hosted-tryon/`

Passos:

1. Copiar `self-hosted-tryon/.env.example` para `self-hosted-tryon/.env`.
2. Ajustar `PUBLIC_BASE_URL`, `FASHN_TRYON_AUTH_TOKEN` e `REDIS_URL`.
3. Escolher backend de output:
   - `OUTPUT_STORAGE_BACKEND=local`
   - `OUTPUT_STORAGE_BACKEND=supabase`
   - `OUTPUT_STORAGE_BACKEND=s3`
4. Se usar `Supabase Storage`, configurar:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_OUTPUT_BUCKET`
   - `SUPABASE_OUTPUT_PREFIX`
5. Se usar `S3`, configurar:
   - `S3_BUCKET_NAME`
   - `S3_REGION`
   - `S3_ACCESS_KEY_ID`
   - `S3_SECRET_ACCESS_KEY`
   - `S3_PUBLIC_BASE_URL` opcional
   - `S3_OUTPUT_PREFIX`
6. Baixar pesos do `FASHN VTON v1.5` para `self-hosted-tryon/weights`.
7. Subir a stack:

```bash
cd self-hosted-tryon
docker compose up --build -d
```

8. Validar:

```bash
curl https://tryon.omafit.co/health
```

## 3. Variáveis das edge functions

Configurar no ambiente do Supabase Functions:

- `TRYON_PROVIDER=self_hosted`
- `SELF_HOSTED_TRYON_URL=https://tryon.omafit.co`
- `SELF_HOSTED_TRYON_TOKEN=<token-da-api>`

Manter também:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SHOPIFY_APP_URL`

## 4. Contrato preservado para o widget

Mesmo com provider self-hosted, o backend do Omafit continua devolvendo:

- `POST /functions/v1/tryon`
  - `success`
  - `fal_request_id`
- `GET /functions/v1/tryon-status/:id`
  - `status`
  - `output`

Isso evita mudanças no widget durante a migração.

## 5. Rollout seguro

Ordem recomendada:

1. Deployar a API self-hosted na EC2.
2. Rodar benchmark com `self-hosted-tryon/scripts/benchmark_pairs.py`.
3. Testar imagens reais fora do widget.
4. Ativar `TRYON_PROVIDER=self_hosted` em staging.
5. Validar `submit -> processing -> completed`.
6. Só então ativar em produção.

## 6. Fallback rápido

Se o provider self-hosted falhar:

1. Voltar `TRYON_PROVIDER=fal`.
2. Redeploy das edge functions.
3. Verificar que `tryon` e `tryon-status` voltaram a consultar o provider anterior.

## 7. Observabilidade mínima

Monitore:

- taxa de jobs `failed`
- tempo médio por job
- uso de VRAM
- uso de disco em `outputs/` se backend local
- crescimento do Redis

Logs-chave:

- `job_id`
- `session_id`
- `public_id`
- `provider`
- `timings`
