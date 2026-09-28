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
          included: (updatedShop.images_included === 0 && (updatedShop.initial_free_images || 0) > 0)
            ? updatedShop.initial_free_images
            : updatedShop.images_included,
          remaining: Math.max(0, ((updatedShop.images_included === 0 && (updatedShop.initial_free_images || 0) > 0)
            ? updatedShop.initial_free_images
            : updatedShop.images_included) - updatedShop.images_used_month)
        }
      };
    }

    // Há imagens extras para cobrar - criar usage record na Shopify

    const subscriptionLineItemId = updatedShop.shopify_usage_line_item_id;

    if (!subscriptionLineItemId) {
      console.warn('[Usage Billing] ⚠️ Usage line item ID não encontrado - uso registrado, mas cobrança pendente');
      return {
        success: true,
        billed: false,
        reason: 'no_usage_line_item',
        message: 'Uso registrado. Cobrança será processada quando a assinatura for ativada.',
        usage: {
          used: updatedShop.images_used_month,
          included: (updatedShop.images_included === 0 && (updatedShop.initial_free_images || 0) > 0)
            ? updatedShop.initial_free_images
            : updatedShop.images_included,
          extraImages: billing.extraImages
        }
      };
    }

    // Se não tiver admin client, apenas registrar uso sem cobrar agora
    if (!adminClient) {
      console.warn('[Usage Billing] ⚠️ Admin client não disponível - uso registrado, cobrança será processada depois');
      return {
        success: true,
        billed: false,
        reason: 'no_admin_client',
        message: 'Uso registrado. Cobrança será processada no próximo ciclo.',
        usage: {
          used: updatedShop.images_used_month,
          included: (updatedShop.images_included === 0 && (updatedShop.initial_free_images || 0) > 0)
            ? updatedShop.initial_free_images
            : updatedShop.images_included,
          extraImages: billing.extraImages,
          pendingAmount: billing.amount
        }
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
    const response = await adminClient.graphql(CREATE_USAGE_RECORD_MUTATION, { variables });
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
  const included = shop.images_included ?? 0;
  const initialFree = shop.initial_free_images ?? 0;
  // Plano free: 50 imagens grátis (uma vez) + 0 recorrente
  const effectiveIncluded = (included === 0 && initialFree > 0) ? initialFree : included;
  const remaining = effectiveIncluded > 0 ? Math.max(0, effectiveIncluded - used) : 0;
  const extra = effectiveIncluded > 0 ? Math.max(0, used - effectiveIncluded) : used;

  return {
    plan: shop.plan,
    used,
    included: effectiveIncluded,
    initialFreeImages: initialFree,
    remaining,
    extra,
    percentage: effectiveIncluded > 0 ? Math.min(100, Math.round((used / effectiveIncluded) * 100)) : 0,
    withinLimit: effectiveIncluded <= 0 || used <= effectiveIncluded,
    billingStatus: shop.billing_status
  };
}
