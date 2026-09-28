# Testes manuais em `public/`

Estas páginas são HTML estático. O Vite publica tudo que está em `public/` na raiz do site (`/test-widget.html`, etc.). Os complementares carregam `./omafit-widget.js`, ou seja, o embed que também está em `public/`.

Por isso **não** foram movidos para `tests/manual/`. Fora de `public/`, essa URL relativa deixa de resolver no `npm run dev` e no deploy, e os guias em `docs/stylist/` apontam para `http://localhost:5173/test-….html`.

| URL | Arquivo | Uso |
| --- | --- | --- |
| `/test-widget.html` | `public/test-widget.html` | Harness de uma vitrine com o embed |
| `/test-widget-multi.html` | `public/test-widget-multi.html` | Mais de um produto na mesma página |
| `/test-complementary-simple.html` | `public/test-complementary-simple.html` | Produto complementar, caso mínimo |
| `/test-complementary-product.html` | `public/test-complementary-product.html` | Variante anterior do mesmo fluxo |
| `/test-complementary-complete.html` | `public/test-complementary-complete.html` | Fluxo complementar com notas no próprio HTML |

`public/carousel-consultor-v3.html` é um canvas estático de tipografia do carrossel do consultor (Instagram), não uma rota do produto. Também precisa permanecer em `public/` para ser aberto pelo dev server. Não é o widget.

Vitest não executa esses HTML. A suíte automatizada é `npm test` (`src/**/*.test.ts`).
