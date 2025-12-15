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
import { createClient } from '@supabase/supabase-js';
import {
  getPlanDetails,
  upsertShopBilling,
} from '../utils/shopify-billing.server';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GraphQL mutation para criar assinatura COM usage pricing
const CREATE_SUBSCRIPTION_MUTATION = `#graphql
  mutation CreateOmafitSubscription(
    $name: String!
    $returnUrl: URL!
    $recurringAmount: Decimal!
    $currency: CurrencyCode!
    $cappedAmount: Decimal!
    $usageTerms: String!
  ) {
    appSubscriptionCreate(
      name: $name
      returnUrl: $returnUrl
      lineItems: [
        {
          plan: {
            appRecurringPricingDetails: {
              price: { amount: $recurringAmount, currencyCode: $currency }
              interval: EVERY_30_DAYS
            }
          }
        },
        {
          plan: {
            appUsagePricingDetails: {
              cappedAmount: { amount: $cappedAmount, currencyCode: $currency }
              terms: $usageTerms
            }
          }
        }
      ]
    ) {
      appSubscription {
        id
        status
        lineItems {
          id
          plan {
            pricingDetails {
              __typename
            }
          }
        }
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

    // Buscar user_id da loja via shopify_stores
    console.log(`[Billing] Buscando user_id para shop: ${shopDomain}`);
    const { data: storeData } = await supabase
      .from('shopify_stores')
      .select('user_id')
      .eq('store_url', shopDomain)
      .maybeSingle();

    const userId = storeData?.user_id || null;

    if (!userId) {
      console.warn(`[Billing] ⚠️ user_id não encontrado para ${shopDomain}. Salvando com user_id null.`);
    } else {
      console.log(`[Billing] ✅ user_id encontrado: ${userId}`);
    }

    // Montar variáveis para a mutation
    const planDisplayName = planDetails.display_name || plan.charAt(0).toUpperCase() + plan.slice(1);
    const returnUrl = `${process.env.SHOPIFY_APP_URL || 'https://autumn-sophisticated-smoking-asian.trycloudflare.com'}/admin/billing/return`;

    // Calcular capped amount (limite máximo de cobrança por uso)
    // Exemplo: Se o plano inclui 100 imagens a $0.17 cada,
    // e queremos permitir até 500 extras, cappedAmount = 500 * 0.17 = $85
    const maxExtraImages = 500; // Ajuste conforme necessário
    const cappedAmount = (maxExtraImages * planDetails.price_per_extra_image).toFixed(2);

    const usageTerms = `Imagens adicionais: ${planDetails.currency} ${planDetails.price_per_extra_image.toFixed(2)} por imagem acima da franquia de ${planDetails.images_included} imagens/mês`;

    const variables = {
      name: `Omafit ${planDisplayName}`,
      returnUrl: returnUrl,
      recurringAmount: planDetails.monthly_price.toString(),
      currency: planDetails.currency,
      cappedAmount: cappedAmount,
      usageTerms: usageTerms
    };

    console.log('[Billing] Criando assinatura na Shopify:', {
      ...variables,
      cappedAmount: `${cappedAmount} ${planDetails.currency}`,
      maxExtraImages
    });

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
    console.log('[Billing] Line items recebidos:', appSubscription.lineItems?.length);

    // Extrair o ID da linha de usage pricing
    let usageLineItemId = null;
    if (appSubscription.lineItems && appSubscription.lineItems.length >= 2) {
      // O segundo lineItem é o de usage pricing
      const usageLineItem = appSubscription.lineItems.find(item =>
        item.plan?.pricingDetails?.__typename === 'AppUsagePricing'
      );

      if (usageLineItem) {
        usageLineItemId = usageLineItem.id;
        console.log('[Billing] ✅ Usage line item ID:', usageLineItemId);
      } else {
        console.warn('[Billing] ⚠️ Usage line item não encontrado na resposta');
      }
    }

    // Salvar no Supabase com status 'pending'
    await upsertShopBilling({
      shopDomain: shopDomain,
      userId: userId,
      plan: plan,
      planDetails: planDetails,
      subscriptionId: appSubscription.id,
      usageLineItemId: usageLineItemId,
      status: 'pending'
    });

    console.log('[Billing] Dados salvos no Supabase');

    // Retornar a confirmationUrl para o front redirecionar
    return json({
      success: true,
      confirmationUrl: confirmationUrl,
      subscriptionId: appSubscription.id,
      usageLineItemId: usageLineItemId,
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
