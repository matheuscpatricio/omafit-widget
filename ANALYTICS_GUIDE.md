# Guia de Analytics Avançado - Omafit

Este documento descreve todas as métricas avançadas disponíveis no Dashboard do Omafit.

## Como Acessar

No menu lateral, clique em **Analytics Avançado** para visualizar todas as métricas detalhadas.

## Métricas Disponíveis

### 1. Métricas de Receita

#### Vendas Totais (R$)
- Valor total de todas as vendas no período selecionado
- Inclui vendas com e sem uso do Omafit

#### Receita Influenciada pelo Omafit (R$)
- Valor total de vendas onde o cliente usou o try-on virtual antes da compra
- Métrica chave para medir o impacto direto do Omafit nas vendas

#### Percentual da Receita Influenciada
- Porcentagem da receita total que foi influenciada pelo uso do Omafit
- Indica a importância do try-on virtual para o negócio

#### Ticket Médio Geral (R$)
- Valor médio de todas as compras (com e sem try-on)
- Calculado: Total de Vendas / Número de Pedidos

#### Ticket Médio com Omafit (R$)
- Valor médio das compras de clientes que usaram o try-on
- **Indicador importante**: Geralmente é maior que o ticket médio geral
- Mostra o aumento de % quando comparado ao ticket médio geral

### 2. Métricas de Usuários

#### Usuários Únicos
- Número total de clientes únicos que usaram o Omafit
- Contado por e-mail único

#### Total de Sessões
- Número total de sessões de try-on realizadas
- Inclui sessões concluídas e não concluídas

#### Try-ons por Usuário
- Média de quantas vezes cada usuário usa o try-on
- Calculado: Total de Sessões / Usuários Únicos
- Indica engajamento dos clientes com a ferramenta

#### Taxa de Recompra (%)
- Porcentagem de clientes que fizeram mais de uma compra
- Importante para medir fidelização
- Clientes que usam try-on tendem a ter maior taxa de recompra

### 3. Métricas de Conversão

#### Pedidos Após Try-on
- Número absoluto de pedidos realizados após o uso do try-on
- Métrica direta de conversão

#### Taxa de Conversão COM Omafit (%)
- Porcentagem de sessões de try-on que resultaram em compra
- Calculado: (Pedidos após Try-on / Sessões Concluídas) × 100
- Métrica chave para ROI do Omafit

#### Taxa de Conversão SEM Omafit (%)
- Taxa de conversão de pedidos sem uso do try-on
- Usado para comparação e cálculo de lift de conversão
- Mostra a diferença positiva quando Omafit é usado

### 4. Métricas de Performance

#### Tempo Médio de Sessão
- Tempo que usuários gastam usando o try-on virtual
- Formato: minutos e segundos (ex: 2m 30s)
- Indica nível de engajamento

#### Tempo de Processamento da IA
- Tempo médio que a IA leva para processar e gerar o resultado
- Importante para monitorar qualidade do serviço
- Meta: manter abaixo de 15 segundos

#### Imagens Processadas
- Número total de imagens processadas pela IA
- Útil para controle de custos e uso da API

#### Tempo Médio de Upload
- Tempo médio que usuários levam para fazer upload e processar
- Inclui tempo de upload + processamento

### 5. Métricas de Comportamento

#### Taxa de Conclusão (%)
- Porcentagem de sessões que foram completadas com sucesso
- Calculado: (Sessões Concluídas / Total de Sessões) × 100
- Meta: acima de 80%

#### Taxa de Abandono (%)
- Porcentagem de usuários que iniciam mas não completam o try-on
- Calculado: (Sessões Abandonadas / Total de Sessões) × 100
- **Importante**: Taxa alta pode indicar problemas de UX

#### Taxa de Compartilhamento (%)
- Porcentagem de usuários que compartilham ou baixam o resultado
- Indica satisfação e potencial marketing viral
- Requer funcionalidade de compartilhamento implementada

### 6. Produtos Mais Testados (TOP 10)

Ranking dos 10 produtos com maior número de try-ons, incluindo:
- Posição no ranking
- Imagem do produto
- Nome do produto
- Número total de try-ons

Esta métrica ajuda a identificar:
- Produtos mais populares
- Produtos que geram mais interesse
- Oportunidades de estoque e marketing

## Interpretação dos Dados

### Indicadores Positivos
- ✅ Ticket médio com Omafit > Ticket médio geral
- ✅ Taxa de conversão com Omafit > Taxa de conversão sem Omafit
- ✅ Taxa de conclusão acima de 80%
- ✅ Taxa de recompra em crescimento
- ✅ Alta porcentagem da receita influenciada pelo Omafit

### Indicadores que Precisam de Atenção
- ⚠️ Taxa de abandono acima de 30%
- ⚠️ Tempo de processamento acima de 20 segundos
- ⚠️ Baixo número de try-ons por usuário (< 1.5)
- ⚠️ Taxa de conversão com Omafit abaixo da esperada

## Filtros de Período

Você pode visualizar as métricas em diferentes períodos:
- **Últimos 7 dias**: Visão de curto prazo, tendências recentes
- **Últimos 30 dias**: Visão mensal padrão, ideal para análises regulares
- **Últimos 90 dias**: Visão trimestral, identifica padrões sazonais
- **Último ano**: Visão anual, análise de crescimento de longo prazo

## Dados de Exemplo

Para testar o sistema, você pode gerar dados de exemplo clicando no botão **"Gerar Dados de Exemplo"**.

Isso criará:
- 20 pedidos simulados
- 10 clientes com histórico de compras
- Sessões de try-on com métricas de performance
- Analytics de produtos

**Nota**: Esta funcionalidade é apenas para demonstração e testes.

## Estrutura do Banco de Dados

As métricas são calculadas a partir de 4 tabelas principais:

### `orders`
- Armazena todos os pedidos
- Vincula pedidos a sessões de try-on
- Rastreia valor do pedido e uso do Omafit

### `customer_analytics`
- Perfil agregado de cada cliente
- Total gasto, número de pedidos
- Frequência de uso do try-on

### `session_analytics`
- Métricas detalhadas de cada sessão
- Duração, conclusão, compartilhamento
- Tempo de processamento

### `product_analytics`
- Performance de cada produto
- Número de try-ons
- Taxa de conversão por produto

## Próximos Passos

Para maximizar o valor das métricas:

1. **Configure webhooks do Shopify** para rastrear pedidos automaticamente
2. **Implemente rastreamento de compartilhamento** no widget
3. **Configure alertas** para métricas críticas
4. **Integre com Google Analytics** para visão completa
5. **Exporte dados** para análises mais profundas (Excel, BI tools)
