/**
 * POST /api/billing/start
 *
 * Inicia o fluxo de assinatura Shopify para o plano escolhido
 *
 * Body esperado:
 * {
 *   "plan": "starter" | "pro" | "enterprise"
 * }
 *
 * Retorna:
 * {
 *   "success": true,
 *   "confirmationUrl": "https://...",
 *   "subscriptionId": "gid://..."
 * }
 */

import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';
import {
  getPlanDetails,
  upsertShopBilling,
  isEnterprisePlan
} from '../utils/shopify-billing.server';

// GraphQL mutation para criar assinatura
const CREATE_SUBSCRIPTION_MUTATION = `#graphql
  mutation CreateOmafitSubscription(
    $name: String!
    $returnUrl: URL!
    $amount: Decimal!
    $currency: CurrencyCode!
    $trialDays: Int
  ) {
    appSubscriptionCreate(
      name: $name
      returnUrl: $returnUrl
      trialDays: $trialDays
      lineItems: [
        {
          plan: {
            appRecurringPricingDetails: {
              price: { amount: $amount, currencyCode: $currency }
              interval: EVERY_30_DAYS
            }
          }
        }
      ]
    ) {
      appSubscription {
        id
        status
      }
      confirmationUrl
      userErrors {
        field
        message
      }
    }
  }
`;

export const action = async ({ request }) => {
  // Autenticar com Shopify
  const { admin, session } = await authenticate.admin(request);

  if (!session || !session.shop) {
    return json({ error: 'Não autenticado' }, { status: 401 });
  }

  const shopDomain = session.shop;

  try {
    // Parse do body
    const body = await request.json();
    const { plan } = body;

    if (!plan) {
      return json({ error: 'Plano não especificado' }, { status: 400 });
    }

    // Validar plano
    if (!['starter', 'pro', 'enterprise'].includes(plan)) {
      return json({ error: 'Plano inválido' }, { status: 400 });
    }

    // Enterprise não usa billing automático
    if (plan === 'enterprise') {
      return json({
        error: 'O plano Enterprise requer contato direto. Por favor, entre em contato conosco.',
        isEnterprise: true
      }, { status: 400 });
    }

    // Buscar detalhes do plano no Supabase
    console.log(`[Billing] Buscando detalhes do plano: ${plan}`);
    const planDetails = await getPlanDetails(plan);

    // Montar variáveis para a mutation
    const planDisplayName = planDetails.display_name || plan.charAt(0).toUpperCase() + plan.slice(1);

    // TODO: Substitua pela URL pública real do seu app Omafit
    // Exemplo: https://omafit.fly.dev/admin/billing/return
    // ou: https://seu-dominio.com/admin/billing/return
    const returnUrl = `${process.env.SHOPIFY_APP_URL || 'https://omafit-app.example.com'}/admin/billing/return`;

    const variables = {
      name: `Omafit ${planDisplayName}`,
      returnUrl: returnUrl,
      amount: planDetails.monthly_price.toString(),
      currency: planDetails.currency,
      trialDays: planDetails.trial_days || 0
    };

    console.log('[Billing] Criando assinatura na Shopify:', variables);

    // Chamar a Shopify GraphQL API
    const response = await admin.graphql(CREATE_SUBSCRIPTION_MUTATION, {
      variables
    });

    const responseJson = await response.json();
    const { appSubscriptionCreate } = responseJson.data || {};

    // Verificar erros
    if (!appSubscriptionCreate || appSubscriptionCreate.userErrors?.length > 0) {
      const errors = appSubscriptionCreate?.userErrors || [];
      console.error('[Billing] Erros da Shopify:', errors);
      return json({
        error: 'Erro ao criar assinatura na Shopify',
        details: errors.map(e => e.message).join(', ')
      }, { status: 400 });
    }

    const { appSubscription, confirmationUrl } = appSubscriptionCreate;

    if (!appSubscription || !confirmationUrl) {
      console.error('[Billing] Resposta inválida da Shopify:', responseJson);
      return json({
        error: 'Resposta inválida da Shopify'
      }, { status: 500 });
    }

    console.log('[Billing] Assinatura criada:', appSubscription.id);

    // TODO: Pegar userId real do sistema Omafit
    // Por enquanto, usamos null (você vai precisar vincular shop_domain com user_id)
    // Exemplo: buscar na tabela shopify_stores o user_id associado ao shop_domain
    const userId = null; // AJUSTAR: buscar userId real

    // Salvar no Supabase com status 'pending'
    await upsertShopBilling({
      shopDomain: shopDomain,
      userId: userId,
      plan: plan,
      planDetails: planDetails,
      subscriptionId: appSubscription.id,
      status: 'pending'
    });

    console.log('[Billing] Dados salvos no Supabase');

    // Retornar a confirmationUrl para o front redirecionar
    return json({
      success: true,
      confirmationUrl: confirmationUrl,
      subscriptionId: appSubscription.id,
      plan: plan
    });

  } catch (error) {
    console.error('[Billing] Erro ao processar billing:', error);
    return json({
      error: 'Erro ao processar billing',
      details: error.message
    }, { status: 500 });
  }
};
