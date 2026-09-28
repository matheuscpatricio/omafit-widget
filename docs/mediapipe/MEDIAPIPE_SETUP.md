# MediaPipe Setup - Detecção Real de Pose

## 🎯 Overview

O sistema agora suporta detecção REAL de pose usando a API Roboflow. Quando configurado, o MediaPipe analisa a foto enviada e extrai medidas corporais reais em vez de usar dados mockados.

## 🔧 Como Funciona

### Sem API Key (Modo Fallback)
- **Confiança**: 0% (dados mockados)
- **Comportamento**: Sistema ignora MediaPipe e usa apenas valores do formulário
- **Logs**: `⚠️ ATENÇÃO: Usando landmarks SIMULADOS (não reais)`

### Com API Key (Modo Real)
- **Confiança**: 50-95% (baseado na qualidade da detecção)
- **Comportamento**: Sistema usa medidas REAIS detectadas na foto
- **Logs**: `✅ Medidas finais REAIS (em cm)`

## 📋 Configuração

### Opção 1: Roboflow (Recomendado - Gratuito)

1. Crie uma conta em https://roboflow.com
2. Acesse https://app.roboflow.com/settings/api
3. Copie sua API Key
4. Configure no Supabase:
   ```bash
   # No painel do Supabase:
   # Settings > Edge Functions > Secrets
   # Adicionar: ROBOFLOW_API_KEY = sua_key_aqui
   ```

### Opção 2: Google MediaPipe (Alternativa)

Se preferir usar a API oficial do Google MediaPipe:

1. Configure `GOOGLE_CLOUD_API_KEY`
2. Modifique `detectPoseLandmarks()` para usar a API do Google
3. Endpoint: `https://vision.googleapis.com/v1/images:annotate`

## 🧪 Como Testar

### 1. Verificar no Console
Ao fazer upload de uma foto, verifique os logs:

**Dados Mockados (sem API)**:
```
⚠️ ROBOFLOW_API_KEY não configurada, usando fallback mockado
⚠️ ATENÇÃO: Usando landmarks SIMULADOS (não reais)
confiança: '0% (MOCKADO)'
```

**Dados Reais (com API)**:
```
✅ Roboflow detectou poses
✅ Medidas finais REAIS (em cm)
confiança: '87% (REAL)'
```

### 2. Verificar Comportamento
- **Com confiança = 0%**: Tamanho mantém o mesmo do formulário
- **Com confiança > 0%**: Tamanho recalculado com medidas da foto

## 🔍 Fluxo de Detecção

```
1. Usuário faz upload da foto
2. Edge Function recebe imagem em base64
3. Tenta chamar API Roboflow
   ├─ Sucesso → landmarks reais (confiança > 0)
   └─ Falha → landmarks mockados (confiança = 0)
4. Calcula medidas corporais
5. Frontend verifica confiança:
   ├─ confiança = 0 → usa dados do formulário
   └─ confiança > 0 → usa medidas do MediaPipe
```

## 📊 Medidas Detectadas

Quando o MediaPipe está ativo, detecta:

- **Largura dos ombros** (shoulder width)
- **Circunferência do peito** (chest circumference)
- **Circunferência da cintura** (waist circumference)
- **Circunferência do quadril** (hip circumference)
- **Comprimento dos braços** (arm length)
- **Comprimento das pernas** (leg length)
- **Altura** (body height)

## ⚠️ Importante

1. **Sem API Key**: Sistema funciona normalmente usando dados do formulário
2. **Com API Key**: Sistema combina dados do formulário com detecção real
3. **Prioridade**: Valores manuais alterados SEMPRE têm prioridade sobre MediaPipe
4. **Fallback**: Se API falhar, sistema volta automaticamente para dados mockados

## 🎨 Melhores Práticas para Fotos

Para melhor detecção com MediaPipe:

- 📸 Foto de corpo inteiro
- 🧍 Pessoa em pé, de frente
- 💡 Boa iluminação
- 👔 Roupa justa (facilita detecção do corpo)
- 🎯 Fundo neutro (evita confusão)
- 📏 Distância ~2-3 metros da câmera

## 🚀 Roadmap

Futuras melhorias:
- [ ] Suporte para múltiplas poses (frente, lado, costas)
- [ ] Calibração automática por altura
- [ ] Detecção de tipo corporal via IA
- [ ] Feedback visual dos landmarks detectados
- [ ] Cache de medidas por usuário
