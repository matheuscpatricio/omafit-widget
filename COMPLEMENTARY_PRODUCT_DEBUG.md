# Debug: Produto Complementar no TryOnWidget

## 📋 Resumo

Este documento explica como funciona o sistema de produto complementar e como debugar se a frase não está aparecendo.

## 🔄 Fluxo de Dados

```
1. HTML da Página (data attributes)
   ↓
2. omafit-widget.js (lê data attributes)
   ↓
3. URL do iframe (complementaryProductUrl)
   ↓
4. WidgetPage.tsx (parse da URL)
   ↓
5. TryOnWidget.tsx (renderiza a frase)
```

## 📝 Configuração no HTML

```html
<div
  id="omafit-widget-root"
  data-shop-domain="sua-loja.myshopify.com"
  data-public-id="seu_widget_key"
  data-product-id="produto-principal-id"
  data-product-name="Nome do Produto Principal"
  data-product-handle="handle-do-produto"
  data-recommended-product-name="Nome do Produto Complementar"
  data-recommended-product-url="https://sua-loja.com/products/produto-complementar"
>
</div>
```

## 🔍 Logs de Debug

### 1. omafit-widget.js

Quando o widget é inicializado, você verá:

```
🎁 Produto complementar lido do data attribute:
   - recommendedProductName: [nome]
   - recommendedProductUrl: [url]
```

Se estiver VAZIO:
```
⚠️ Produto complementar NÃO disponível
```

### 2. URL do iframe

```
🎁 Produto complementar sendo enviado na URL: {title, url, handle}
```

OU

```
⚠️ Nenhum produto complementar para enviar
```

### 3. PostMessage

```
📤 Enviando produto complementar via postMessage: {title, url}
```

### 4. WidgetPage.tsx

```
🔍 ===== WIDGETPAGE: PARÂMETROS DA URL =====
   - 🎁 complementaryProductUrl: [json]
   - 🎁 recommendedProductName: [nome]
   - 🎁 recommendedProductUrl: [url]
```

Quando recebido com sucesso:
```
✅ Produto complementar recebido: {title, url}
```

OU via postMessage:
```
✅ Definindo produto complementar via omafit-config-update:
   - Nome: [nome]
   - URL: [url]
```

### 5. TryOnWidget.tsx (Props)

```
🎯 ===== TRYON WIDGET INICIALIZADO =====
   - 🎁 recommendedProductName: [nome]
   - 🎁 recommendedProductUrl: [url]
```

### 6. TryOnWidget.tsx (Renderização)

Na tela de resultado, você verá:

```
🎁 [RESULTADO 1] Verificando produto complementar:
   - recommendedProductName: [nome]
   - recommendedProductUrl: [url]
   - Vai mostrar frase? true/false
```

## ✅ Teste Rápido

1. Abra: `http://localhost:5173/test-complementary-simple.html`
2. Abra o Console (F12)
3. Clique em "Experimentar virtualmente"
4. Verifique TODOS os logs acima em sequência
5. Faça upload de uma foto
6. Na tela de resultado, procure por: **"Uma ótima escolha para acompanhar seu pedido seria..."**

## 🐛 Diagnóstico de Problemas

### Problema: Logs mostram VAZIO no data attribute

**Causa:** Os data attributes não estão configurados no HTML

**Solução:** Adicione `data-recommended-product-name` e `data-recommended-product-url` no elemento `omafit-widget-root`

### Problema: URL do iframe não contém complementaryProductUrl

**Causa:** O omafit-widget.js não está pegando os valores corretamente

**Solução:** Verifique se o elemento tem id="omafit-widget-root"

### Problema: WidgetPage não recebe os parâmetros

**Causa:** Problema no parse da URL

**Solução:** Verifique se a URL do iframe está correta nos logs

### Problema: TryOnWidget recebe props VAZIAS

**Causa:** WidgetPage não está passando as props corretamente

**Solução:** Verifique os logs do WidgetPage antes de renderizar o TryOnWidget

### Problema: Props estão corretas mas frase não aparece

**Causa:** Condição `recommendedProductName && recommendedProductUrl` é falsa

**Solução:** Verifique os logs `[RESULTADO 1]` e `[RESULTADO 2]` para ver os valores exatos

## 📁 Arquivos Modificados

1. `/public/omafit-widget.js` - Leitura dos data attributes e envio via URL/PostMessage
2. `/src/components/WidgetPage.tsx` - Parse da URL e recebimento via PostMessage
3. `/src/components/TryOnWidget.tsx` - Renderização da frase

## 🎯 Código da Frase

A frase é renderizada em 2 lugares no TryOnWidget (duas telas de resultado diferentes):

```tsx
{recommendedProductName && recommendedProductUrl && (
  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
    <p className="text-sm text-gray-700 text-center">
      Uma ótima escolha para acompanhar seu pedido seria{' '}
      <strong>{recommendedProductName}</strong>,{' '}
      <a
        href={recommendedProductUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold underline hover:opacity-70 transition-opacity"
        style={{ color: primaryColor }}
      >
        clique aqui
      </a>{' '}
      e confira.
    </p>
  </div>
)}
```

## 🔧 Como Remover os Logs

Quando tudo estiver funcionando, você pode remover os `console.log` de debug:

1. Em `omafit-widget.js`: Remover logs com 🎁, 📤, ⚠️
2. Em `WidgetPage.tsx`: Remover logs com 🎁
3. Em `TryOnWidget.tsx`: Remover os blocos `{(() => { console.log... })()}`
