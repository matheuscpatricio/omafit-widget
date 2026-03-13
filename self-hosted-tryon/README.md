# Omafit Self-Hosted Try-On

Base de API assíncrona para rodar `FASHN VTON v1.5` em EC2 GPU e integrar com as edge functions do Omafit sem quebrar o contrato atual do widget.

## Stack

- `FastAPI` para `POST /jobs` e `GET /jobs/{jobId}`
- `Redis` + `RQ` para fila assíncrona
- `FASHN VTON v1.5` como engine de try-on
- storage configurável para output: `local`, `Supabase Storage` ou `S3`

## Requisitos de infraestrutura

- Ubuntu 24.04
- NVIDIA A10G 24 GB (`g5.xlarge`)
- Docker Engine + NVIDIA Container Toolkit
- disco recomendado: `100-150 GB`

## Arquivos principais

- `app/main.py`: API e contrato HTTP
- `app/worker.py`: worker GPU e chamada do modelo
- `docker-compose.yml`: stack local da EC2
- `.env.example`: variáveis de ambiente

## Variáveis de ambiente

Copie `.env.example` para `.env` e ajuste:

- `FASHN_TRYON_AUTH_TOKEN`: token Bearer exigido pela API
- `PUBLIC_BASE_URL`: URL pública da instância, ex. `https://tryon.omafit.co`
- `OUTPUT_STORAGE_BACKEND`: `local`, `supabase` ou `s3`
- `REDIS_URL`: URL do Redis
- `OUTPUTS_DIR`: diretório dos resultados
- `WEIGHTS_DIR`: diretório dos pesos do modelo

Se usar `Supabase Storage`, configure também:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_OUTPUT_BUCKET`
- `SUPABASE_OUTPUT_PREFIX`

Se usar `S3`, configure também:

- `S3_BUCKET_NAME`
- `S3_REGION`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_ENDPOINT_URL` opcional
- `S3_PUBLIC_BASE_URL` opcional
- `S3_OUTPUT_PREFIX`

## Subida inicial

1. Instale Docker e NVIDIA Container Toolkit.
2. Copie `.env.example` para `.env`.
3. Baixe os pesos do modelo para `./weights`.
4. Suba a stack:

```bash
docker compose up --build -d
```

5. Valide a saúde:

```bash
curl https://tryon.omafit.co/health
```

## Contrato da API

### `POST /jobs`

Entrada:

```json
{
  "person_image_url": "https://...",
  "garment_image_url": "https://...",
  "category": "tops",
  "session_id": "uuid-opcional",
  "public_id": "wgt_pub_xxx"
}
```

Saída:

```json
{
  "job_id": "rq-job-id",
  "status": "queued"
}
```

### `GET /jobs/{jobId}`

Durante processamento:

```json
{
  "job_id": "rq-job-id",
  "status": "processing"
}
```

Em sucesso:

```json
{
  "job_id": "rq-job-id",
  "status": "completed",
  "result_url": "https://tryon.omafit.co/outputs/rq-job-id.png",
  "timings": {
    "download_seconds": 0.42,
    "inference_seconds": 11.8,
    "total_seconds": 12.4
  }
}
```

## Checklist de validação na EC2

Antes de ligar isso ao Omafit, valide:

1. `nvidia-smi` mostra a A10G corretamente.
2. `GET /health` responde `200`.
3. Um job com imagens reais do Omafit conclui com `status=completed`.
4. A imagem final abre pela `result_url`.
5. Tempo médio por job cabe no polling atual do widget.
6. `tops`, `bottoms` e `one-pieces` geram resultados coerentes.

## Backends de output

### `OUTPUT_STORAGE_BACKEND=local`

- salva no diretório local `OUTPUTS_DIR`
- serve a imagem em `/outputs/...`
- ideal para POC rápida

### `OUTPUT_STORAGE_BACKEND=supabase`

- faz upload do resultado para `Supabase Storage`
- gera URL pública no bucket configurado
- melhor opção se você quer manter tudo no stack atual do Omafit

### `OUTPUT_STORAGE_BACKEND=s3`

- faz upload do resultado para um bucket S3
- ideal se você quiser desacoplar storage do Supabase

## Observações operacionais

- O contrato foi desenhado para as edge functions continuarem devolvendo `fal_request_id`, `status` e `output` ao widget.
- Para produção, prefira `Supabase Storage` ou `S3` em vez de storage local.
- O ideal é colocar Nginx na frente da API, TLS e rate limiting.
