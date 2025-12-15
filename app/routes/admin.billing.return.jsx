/**
 * GET /admin/billing/return
 *
 * Callback usado pela Shopify após o lojista aprovar a assinatura
 * Esta rota é chamada automaticamente pela Shopify quando o lojista
 * confirma a cobrança na página de confirmationUrl
 *
 * Fluxo:
 * 1. Shopify redireciona para esta URL após aprovação
 * 2. Atualizamos o status para 'active' no Supabase
 * 3. Redirecionamos o lojista para a dashboard principal
 */

import { redirect } from '@remix-run/node';
import { authenticate } from '../shopify.server';
import { updateBillingStatus, getShopBilling } from '../utils/shopify-billing.server';

// Query GraphQL para confirmar status da assinatura (opcional, mas recomendado)
const GET_SUBSCRIPTION_QUERY = `#graphql
  query GetCurrentAppSubscription {
    currentAppInstallation {
      activeSubscriptions {
        id
        name
        status
        createdAt
        currentPeriodEnd
        lineItems {
          id
          plan {
            pricingDetails {
              __typename
              ... on AppRecurringPricing {
                price {
                  amount
                  currencyCode
                }
                interval
              }
            }
          }
        }
      }
    }
  }
`;

export const loader = async ({ request }) => {
  try {
    // Autenticar com Shopify
    const { admin, session } = await authenticate.admin(request);

    if (!session || !session.shop) {
      console.error('[Billing Return] Sessão inválida');
      // Se não tiver sessão, redireciona para home
      return redirect('/');
    }

    const shopDomain = session.shop;
    console.log(`[Billing Return] Processando retorno para: ${shopDomain}`);

    // Buscar dados atuais da loja no Supabase
    const shop = await getShopBilling(shopDomain);

    if (!shop) {
      console.error('[Billing Return] Loja não encontrada no Supabase:', shopDomain);
      // Redirecionar mesmo assim, mas logar erro
      return redirect('/app');
    }

    // Opcional: Confirmar status da assinatura na Shopify
    try {
      const response = await admin.graphql(GET_SUBSCRIPTION_QUERY);
      const responseJson = await response.json();
      const subscriptions = responseJson.data?.currentAppInstallation?.activeSubscriptions || [];

      console.log('[Billing Return] Assinaturas ativas:', subscriptions.length);

      // Verificar se há pelo menos uma assinatura ativa
      const hasActiveSubscription = subscriptions.some(sub => sub.status === 'ACTIVE');

      if (hasActiveSubscription) {
        console.log('[Billing Return] Assinatura confirmada como ACTIVE na Shopify');

        // Atualizar status no Supabase
        await updateBillingStatus(shopDomain, 'active');
        console.log('[Billing Return] Status atualizado para active no Supabase');
      } else {
        console.warn('[Billing Return] Nenhuma assinatura ACTIVE encontrada');
        // Pode estar PENDING ainda, manter como está
      }
    } catch (queryError) {
      // Se falhar a query, continuar mesmo assim
      // (o status pode ser atualizado depois via webhook)
      console.error('[Billing Return] Erro ao verificar assinatura:', queryError);

      // Assumir que está ativo se chegou aqui
      await updateBillingStatus(shopDomain, 'active');
    }

    // Redirecionar para a dashboard principal do app
    // TODO: Ajuste a rota para onde você quer redirecionar
    // Exemplos: '/app', '/admin', '/dashboard', etc.
    console.log('[Billing Return] Redirecionando para dashboard');
    return redirect('/app');

  } catch (error) {
    console.error('[Billing Return] Erro ao processar retorno:', error);

    // Em caso de erro, redirecionar para home do app
    return redirect('/app');
  }
};

// Componente vazio (esta rota só usa o loader)
export default function BillingReturn() {
  return null;
}
