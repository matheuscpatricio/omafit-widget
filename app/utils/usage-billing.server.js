/**
 * Usage Billing - Cobrança por uso de imagens extras
 *
 * Este módulo gerencia a cobrança automática de imagens extras
 * quando a loja ultrapassa o limite incluído no plano
 */

import { authenticate } from '../shopify.server';
import {
  getShopBilling,
  incrementImageUsage,
  calculateExtraImagesBilling,
  saveUsageRecord,
  isEnterprisePlan
} from './shopify-billing.server';

// GraphQL mutation para criar usage record na Shopify
const CREATE_USAGE_RECORD_MUTATION = `#graphql
  mutation CreateOmafitUsageRecord(
    $subscriptionLineItemId: ID!
    $amount: Decimal!
    $currency: CurrencyCode!
    $description: String!
  ) {
    appUsageRecordCreate(
      subscriptionLineItemId: $subscriptionLineItemId
      description: $description
      price: { amount: $amount, currencyCode: $currency }
    ) {
      appUsageRecord {
        id
        price {
          amount
          currencyCode
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

/**
 * Registra uso de imagens e cria cobrança se necessário
 *
 * IMPORTANTE: Chame esta função toda vez que uma loja gerar imagens
 *
 * @param {string} shopDomain - Domínio da loja (ex: minha-loja.myshopify.com)
 * @param {number} imagesCount - Quantidade de imagens geradas (default: 1)
 * @param {Object} adminClient - Cliente GraphQL Admin da Shopify (opcional, se não passar, cria novo)
 * @returns {Promise<Object>} Resultado com info do uso e cobrança
 */
export async function registerImageUsageAndBill(shopDomain, imagesCount = 1, adminClient = null) {
  try {
    console.log(`[Usage Billing] Registrando uso de ${imagesCount} imagens para ${shopDomain}`);

    // Verificar se é plano Enterprise (não cobra automaticamente)
    const isEnterprise = await isEnterprisePlan(shopDomain);
    if (isEnterprise) {
      console.log('[Usage Billing] Plano Enterprise - cobrança manual');
      // Apenas incrementa o contador, não cobra
      await incrementImageUsage(shopDomain, imagesCount);
      return {
        success: true,
        billed: false,
        reason: 'enterprise_plan',
        message: 'Plano Enterprise não usa cobrança automática'
      };
    }

    // Incrementar contador de imagens usadas
    const updatedShop = await incrementImageUsage(shopDomain, imagesCount);
    console.log(`[Usage Billing] Contador atualizado: ${updatedShop.images_used_month} imagens`);

    // Calcular se há imagens extras para cobrar
    const billing = calculateExtraImagesBilling(updatedShop);

    console.log('[Usage Billing] Cálculo:', {
      imagesUsed: updatedShop.images_used_month,
      imagesIncluded: updatedShop.images_included,
      extraImages: billing.extraImages,
      amount: billing.amount,
      shouldCharge: billing.shouldCharge
    });

    // Se não houver imagens extras, retornar
    if (!billing.shouldCharge) {
      return {
        success: true,
        billed: false,
        reason: 'within_limit',
        message: 'Ainda dentro do limite incluído',
        usage: {
          used: updatedShop.images_used_month,
          included: updatedShop.images_included,
          remaining: Math.max(0, updatedShop.images_included - updatedShop.images_used_month)
        }
      };
    }

    // Há imagens extras para cobrar - criar usage record na Shopify

    // IMPORTANTE: Precisamos do shopify_usage_line_item_id
    // Este ID vem da linha de item de uso da assinatura
    // Por enquanto, vamos usar o shopify_app_subscription_id
    // TODO: Na criação da assinatura, você pode adicionar uma linha de usage pricing
    // e salvar o ID dela em shopify_usage_line_item_id

    const subscriptionLineItemId = updatedShop.shopify_usage_line_item_id
      || updatedShop.shopify_app_subscription_id;

    if (!subscriptionLineItemId) {
      console.error('[Usage Billing] Subscription line item ID não encontrado');
      return {
        success: false,
        error: 'Subscription line item ID não configurado',
        billed: false
      };
    }

    // Criar cliente Admin se não foi passado
    let admin = adminClient;
    if (!admin) {
      // TODO: Você precisa ter acesso ao admin client aqui
      // Opção 1: Passar sempre como parâmetro
      // Opção 2: Criar uma rota API que chama esta função
      // Opção 3: Usar offline access token salvo no Supabase
      console.error('[Usage Billing] Admin client não disponível');
      return {
        success: false,
        error: 'Admin client não disponível',
        billed: false,
        note: 'Chame esta função passando o admin client ou via rota API'
      };
    }

    // Montar descrição
    const description = `${billing.extraImages} ${billing.extraImages === 1 ? 'imagem adicional' : 'imagens adicionais'} geradas no Omafit`;

    // Variáveis para a mutation
    const variables = {
      subscriptionLineItemId: subscriptionLineItemId,
      amount: billing.amount.toString(),
      currency: updatedShop.currency,
      description: description
    };

    console.log('[Usage Billing] Criando usage record na Shopify:', variables);

    // Chamar a Shopify GraphQL API
    const response = await admin.graphql(CREATE_USAGE_RECORD_MUTATION, { variables });
    const responseJson = await response.json();
    const { appUsageRecordCreate } = responseJson.data || {};

    // Verificar erros
    if (!appUsageRecordCreate || appUsageRecordCreate.userErrors?.length > 0) {
      const errors = appUsageRecordCreate?.userErrors || [];
      console.error('[Usage Billing] Erros da Shopify:', errors);
      return {
        success: false,
        billed: false,
        error: 'Erro ao criar usage record na Shopify',
        details: errors.map(e => e.message).join(', ')
      };
    }

    const { appUsageRecord } = appUsageRecordCreate;

    if (!appUsageRecord) {
      console.error('[Usage Billing] Resposta inválida da Shopify:', responseJson);
      return {
        success: false,
        billed: false,
        error: 'Resposta inválida da Shopify'
      };
    }

    console.log('[Usage Billing] Usage record criado:', appUsageRecord.id);

    // Salvar no Supabase
    await saveUsageRecord({
      shopDomain: shopDomain,
      usageRecordId: appUsageRecord.id,
      amount: billing.amount,
      currency: updatedShop.currency,
      imagesCount: billing.extraImages,
      description: description
    });

    console.log('[Usage Billing] Registro salvo no Supabase');

    return {
      success: true,
      billed: true,
      usageRecordId: appUsageRecord.id,
      amount: billing.amount,
      currency: updatedShop.currency,
      imagesCount: billing.extraImages,
      message: `Cobrança de ${billing.extraImages} imagens extras: ${updatedShop.currency} ${billing.amount}`
    };

  } catch (error) {
    console.error('[Usage Billing] Erro ao processar cobrança:', error);
    return {
      success: false,
      billed: false,
      error: error.message
    };
  }
}

/**
 * Exemplo de como chamar via rota API
 *
 * Crie uma rota POST /api/billing/usage que:
 * 1. Autentica com Shopify
 * 2. Recebe { shopDomain, imagesCount } no body
 * 3. Chama registerImageUsageAndBill() passando o admin client
 * 4. Retorna o resultado
 */

/**
 * Verifica o uso atual de imagens da loja
 * @param {string} shopDomain - Domínio da loja
 * @returns {Promise<Object>} Informações de uso
 */
export async function getImageUsageInfo(shopDomain) {
  const shop = await getShopBilling(shopDomain);

  if (!shop) {
    throw new Error(`Loja ${shopDomain} não encontrada`);
  }

  const used = shop.images_used_month || 0;
  const included = shop.images_included || 0;
  const remaining = Math.max(0, included - used);
  const extra = Math.max(0, used - included);

  return {
    plan: shop.plan,
    used,
    included,
    remaining,
    extra,
    percentage: Math.min(100, Math.round((used / included) * 100)),
    withinLimit: used <= included,
    billingStatus: shop.billing_status
  };
}
