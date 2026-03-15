# Comandos exatos para EC2 Ubuntu 24.04

Este guia assume:

- EC2 `g5.xlarge`
- Ubuntu `24.04`
- projeto em `~/omafit-widget/self-hosted-tryon`
- domínio final `tryon.omafit.co`

## 1. Atualizar sistema

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ca-certificates gnupg lsb-release software-properties-common unzip
```

## 2. Instalar driver NVIDIA

```bash
sudo apt install -y ubuntu-drivers-common
sudo ubuntu-drivers autoinstall
sudo reboot
```

Depois do reboot:

```bash
nvidia-smi
```

## 3. Instalar Docker

```bash


sudo chmod a+r /sudo install -m 0755 -d /etc/apt/keyringsetc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
newgrp docker
docker --version
docker compose version
```

## 4. Instalar NVIDIA Container Toolkit

```bash
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | \
  sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
sudo apt update
sudo apt install -y nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
docker run --rm --gpus all nvidia/cuda:12.1.1-cudnn8-runtime-ubuntu22.04 nvidia-smi
```

## 5. Ajustar disco para o projeto

```bash
mkdir -p ~/omafit-widget
cd ~/omafit-widget
```

Se você ainda estiver com `50 GB`, o ideal é aumentar o volume no console AWS para pelo menos `100 GB` antes de seguir.

## 6. Copiar o projeto

Se usar git:

```bash
git clone <SEU_REPOSITORIO> ~/omafit-widget
cd ~/omafit-widget/self-hosted-tryon
```

Se você vai só copiar essa pasta:

```bash
c
```

## 7. Criar `.env`

```bash
cp .env.example .env
nano .env
```

### Exemplo usando Supabase Storage

```env
FASHN_TRYON_AUTH_TOKEN=troque-esse-token
REDIS_URL=redis://redis:6379/0
RQ_QUEUE_NAME=tryon
HOST=0.0.0.0
PORT=8000
PUBLIC_BASE_URL=https://tryon.omafit.co
OUTPUT_STORAGE_BACKEND=supabase
OUTPUTS_DIR=/app/outputs
WEIGHTS_DIR=/app/weights
RQ_JOB_TIMEOUT=900
RQ_RESULT_TTL=86400
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=SUA_SERVICE_ROLE
SUPABASE_OUTPUT_BUCKET=tryon-images
SUPABASE_OUTPUT_PREFIX=self-hosted-results
NUM_TIMESTEPS=18
```

**URLs públicas:** o bucket `tryon-images` precisa estar **público**. No Supabase Dashboard: Storage → tryon-images → ⋮ → Edit bucket → marque **Public bucket**. A URL retornada será `https://SEU-PROJETO.supabase.co/storage/v1/object/public/tryon-images/self-hosted-results/xxx.png`.

### Exemplo usando S3

```env
FASHN_TRYON_AUTH_TOKEN=troque-esse-token
REDIS_URL=redis://redis:6379/0
RQ_QUEUE_NAME=tryon
HOST=0.0.0.0
PORT=8000
PUBLIC_BASE_URL=https://tryon.omafit.co
OUTPUT_STORAGE_BACKEND=s3
OUTPUTS_DIR=/app/outputs
WEIGHTS_DIR=/app/weights
RQ_JOB_TIMEOUT=900
RQ_RESULT_TTL=86400
S3_BUCKET_NAME=omafit-tryon-results
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=SEU_ACCESS_KEY
S3_SECRET_ACCESS_KEY=SEU_SECRET_KEY
S3_PUBLIC_BASE_URL=https://omafit-tryon-results.s3.us-east-1.amazonaws.com
S3_OUTPUT_PREFIX=self-hosted-results
```

## 8. Criar diretórios de runtime

```bash
mkdir -p outputs weights
```

## 9. Baixar pesos do modelo

```bash
cd ~/omafit-widget/self-hosted-tryon
docker compose run --rm worker bash -c "cd /opt/fashn-vton && python3 scripts/download_weights.py --weights-dir /app/weights"
```

Aguarde o download (~2 GB). Depois confira:

```bash
ls -la weights/
ls -la weights/dwpose/
```

## 10. Subir a stack

```bash
cd ~/omafit-widget/self-hosted-tryon
docker compose up --build -d
docker compose ps
docker compose logs -f api
```

## 11. Testar healthcheck

```bash
curl http://127.0.0.1:8000/health
```

Com backend `supabase`, a resposta deve incluir:

```json
{"ok":true,"queue":"tryon","output_storage_backend":"supabase",...}
```

## 12. Subir Nginx (obrigatório para o widget acessar a API)

**Importante:** sem este passo, o Nginx retorna 404 e o widget não consegue usar o try-on self-hosted.

```bash
sudo apt install -y nginx
sudo rm -f /etc/nginx/sites-enabled/default
sudo tee /etc/nginx/sites-available/tryon.omafit.co > /dev/null <<'EOF'
server {
    listen 80;
    server_name tryon.omafit.co;

    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
sudo ln -s /etc/nginx/sites-available/tryon.omafit.co /etc/nginx/sites-enabled/tryon.omafit.co
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## 13. Ativar HTTPS com Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d tryon.omafit.co
```

## 14. Testar job real

```bash
curl -X POST "https://tryon.omafit.co/jobs" \
  -H "Authorization: Bearer troque-esse-token" \
  -H "Content-Type: application/json" \
  -d '{
    "person_image_url": "https://SEU-ARQUIVO-PESSOA.png",
    "garment_image_url": "https://SEU-ARQUIVO-ROUPA.png",
    "category": "tops",
    "session_id": "manual-test",
    "public_id": "manual"
  }'
```

Depois consulte:

```bash
curl -H "Authorization: Bearer troque-esse-token" \
  "https://tryon.omafit.co/jobs/SEU_JOB_ID"
```

## 15. Otimizações de latência (opcional)

Para reduzir o tempo total sem perder qualidade:

- **Download paralelo**: pessoa e roupa já são baixadas em paralelo.
- **TF32 + cuDNN benchmark**: habilitados automaticamente na GPU.
- **num_timesteps**: padrão 18. Para mais velocidade (leve perda de qualidade), use `NUM_TIMESTEPS=15`; para máxima qualidade, `NUM_TIMESTEPS=30`.
- **Região**: EC2 e bucket Supabase na mesma região (ex.: `us-east-1`) reduzem latência de download.
- **Roupa no Supabase**: se a roupa vier do Shopify CDN, o download pode ser mais lento. Hospedar no Supabase (mesma região) acelera.

Para ver onde o tempo vai: o `timings` da resposta traz `download_seconds` e `inference_seconds`. Se download > 10s, priorize região e URLs próximas. Se inference > 15s, considere instância maior (g5.2xlarge).

```env
NUM_TIMESTEPS=18
```

## 16. Configurar Supabase Functions (obrigatório para o widget usar self-hosted)

**1. Definir secrets no Supabase:**

Use a URL base da sua API (onde responde `GET /health`). Exemplos:
- `https://tryon.omafit.co` — exige registro DNS (A record) apontando para o IP da EC2
- `https://omafit.co` — se a API estiver no mesmo domínio (ex.: proxy reverso em `/api/tryon`)

```bash
npx supabase secrets set TRYON_PROVIDER=self_hosted
npx supabase secrets set SELF_HOSTED_TRYON_URL=https://omafit.co
npx supabase secrets set SELF_HOSTED_TRYON_TOKEN=seu-token-do-env
```

**Se usar subdomínio (tryon.omafit.co):** crie um registro A no DNS apontando para o IP público da EC2.

**2. Fazer deploy das Edge Functions** (obrigatório para aplicar os secrets):

```bash
cd /caminho/do/omafit-widget
npx supabase functions deploy tryon
npx supabase functions deploy tryon-status
```

Sem o deploy, as secrets não são aplicadas e o widget continua usando fal.ai.

**3. Conferir nos logs:** Supabase → Edge Functions → tryon → Logs. Deve aparecer `Try-on provider: self_hosted`.

## 17. Rollback rápido

Se precisar voltar para fal.ai:

```bash
npx supabase secrets set TRYON_PROVIDER=fal
npx supabase functions deploy tryon
npx supabase functions deploy tryon-status
```
