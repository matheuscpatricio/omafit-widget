/**
 * Shopify Billing Utilities
 *
 * Funções auxiliares para gerenciar billing da Shopify integrado com Supabase
 */

import { createClient } from '@supabase/supabase-js';

// TODO: Adicione estas variáveis no seu .env
// SUPABASE_URL=https://lhkgnirolvbmomeduoaj.supabase.co
// SUPABASE_SERVICE_ROLE_KEY=sua_service_key_aqui

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar configurados no .env');
}

// Cliente Supabase com service key (só usar no servidor!)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Busca informações do plano no Supabase
 * @param {string} planName - Nome do plano (starter, pro, enterprise)
 * @returns {Promise<Object>} Dados do plano
 */
export async function getPlanDetails(planName) {
  const { data, error } = await supabase
    .from('billing_plans')
    .select('*')
    .eq('name', planName)
    .eq('active', true)
    .maybeSingle();

  if (error) {
    console.error('Erro ao buscar plano:', error);
    throw new Error(`Plano ${planName} não encontrado`);
  }

  if (!data) {
    throw new Error(`Plano ${planName} não encontrado ou inativo`);
  }

  return data;
}

/**
 * Cria ou atualiza informações da loja no Supabase
 * @param {Object} params
 * @param {string} params.shopDomain - Domínio da loja
 * @param {string} params.userId - ID do usuário
 * @param {string} params.plan - Nome do plano
 * @param {Object} params.planDetails - Detalhes do plano
 * @param {string} params.subscriptionId - ID da assinatura Shopify
 * @param {string} params.status - Status do billing
 * @returns {Promise<Object>} Dados da loja
 */
export async function upsertShopBilling({
  shopDomain,
  userId,
  plan,
  planDetails,
  subscriptionId = null,
  status = 'pending'
}) {
  const now = new Date();
  const cycleEnd = new Date(now);
  cycleEnd.setDate(cycleEnd.getDate() + 30); // 30 dias de ciclo

  const shopData = {
    shop_domain: shopDomain,
    user_id: userId,
    plan: plan,
    images_included: planDetails.images_included,
    price_per_extra_image: planDetails.price_per_extra_image,
    currency: planDetails.currency,
    billing_status: status,
    billing_cycle_start: now.toISOString(),
    billing_cycle_end: cycleEnd.toISOString(),
    images_used_month: 0,
    last_billed_images: 0,
    updated_at: now.toISOString()
  };

  if (subscriptionId) {
    shopData.shopify_app_subscription_id = subscriptionId;
  }

  // Tenta fazer upsert (insert ou update)
  const { data, error } = await supabase
    .from('shopify_shops')
    .upsert(shopData, { onConflict: 'shop_domain' })
    .select()
    .single();

  if (error) {
    console.error('Erro ao salvar billing da loja:', error);
    throw new Error('Falha ao salvar informações de billing');
  }

  return data;
}

/**
 * Busca informações de billing da loja
 * @param {string} shopDomain - Domínio da loja
 * @returns {Promise<Object|null>} Dados da loja ou null
 */
export async function getShopBilling(shopDomain) {
  const { data, error } = await supabase
    .from('shopify_shops')
    .select('*')
    .eq('shop_domain', shopDomain)
    .maybeSingle();

  if (error) {
    console.error('Erro ao buscar billing da loja:', error);
    return null;
  }

  return data;
}

/**
 * Atualiza o status de billing da loja
 * @param {string} shopDomain - Domínio da loja
 * @param {string} status - Novo status
 * @returns {Promise<Object>} Dados atualizados
 */
export async function updateBillingStatus(shopDomain, status) {
  const { data, error } = await supabase
    .from('shopify_shops')
    .update({
      billing_status: status,
      updated_at: new Date().toISOString()
    })
    .eq('shop_domain', shopDomain)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar status:', error);
    throw new Error('Falha ao atualizar status de billing');
  }

  return data;
}

/**
 * Incrementa contador de imagens usadas no mês
 * @param {string} shopDomain - Domínio da loja
 * @param {number} count - Quantidade de imagens a adicionar
 * @returns {Promise<Object>} Dados atualizados com novo contador
 */
export async function incrementImageUsage(shopDomain, count = 1) {
  // Buscar dados atuais
  const shop = await getShopBilling(shopDomain);

  if (!shop) {
    throw new Error(`Loja ${shopDomain} não encontrada`);
  }

  const newCount = (shop.images_used_month || 0) + count;

  const { data, error } = await supabase
    .from('shopify_shops')
    .update({
      images_used_month: newCount,
      updated_at: new Date().toISOString()
    })
    .eq('shop_domain', shopDomain)
    .select()
    .single();

  if (error) {
    console.error('Erro ao incrementar uso de imagens:', error);
    throw new Error('Falha ao registrar uso de imagens');
  }

  return data;
}

/**
 * Calcula imagens extras que precisam ser cobradas
 * @param {Object} shop - Dados da loja do Supabase
 * @returns {Object} { extraImages, amount, shouldCharge }
 */
export function calculateExtraImagesBilling(shop) {
  const imagesUsed = shop.images_used_month || 0;
  const imagesIncluded = shop.images_included || 0;
  const lastBilled = shop.last_billed_images || 0;

  // Calcular quantas imagens extras temos (acima do limite incluído)
  const totalExtraImages = Math.max(0, imagesUsed - imagesIncluded);

  // Calcular quantas imagens extras ainda não foram cobradas
  const unbilledExtraImages = Math.max(0, totalExtraImages - lastBilled);

  const shouldCharge = unbilledExtraImages > 0;
  const amount = shouldCharge ? unbilledExtraImages * shop.price_per_extra_image : 0;

  return {
    extraImages: unbilledExtraImages,
    amount: parseFloat(amount.toFixed(2)),
    shouldCharge,
    totalExtraImages,
    lastBilled
  };
}

/**
 * Registra um usage record no Supabase
 * @param {Object} params
 * @param {string} params.shopDomain - Domínio da loja
 * @param {string} params.usageRecordId - ID do AppUsageRecord da Shopify
 * @param {number} params.amount - Valor cobrado
 * @param {string} params.currency - Moeda
 * @param {number} params.imagesCount - Quantidade de imagens
 * @param {string} params.description - Descrição
 * @returns {Promise<Object>} Dados do registro criado
 */
export async function saveUsageRecord({
  shopDomain,
  usageRecordId,
  amount,
  currency,
  imagesCount,
  description
}) {
  const now = new Date();
  const billingMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const { data, error } = await supabase
    .from('shopify_usage_records')
    .insert({
      shop_domain: shopDomain,
      shopify_usage_record_id: usageRecordId,
      amount,
      currency,
      images_count: imagesCount,
      description,
      billing_month: billingMonth
    })
    .select()
    .single();

  if (error) {
    console.error('Erro ao salvar usage record:', error);
    throw new Error('Falha ao salvar registro de uso');
  }

  // Atualizar last_billed_images na loja
  const shop = await getShopBilling(shopDomain);
  if (shop) {
    const newLastBilled = (shop.last_billed_images || 0) + imagesCount;
    await supabase
      .from('shopify_shops')
      .update({ last_billed_images: newLastBilled })
      .eq('shop_domain', shopDomain);
  }

  return data;
}

/**
 * Reseta o contador de imagens usado no mês (chamar no início de novo ciclo)
 * @param {string} shopDomain - Domínio da loja
 * @returns {Promise<Object>} Dados atualizados
 */
export async function resetMonthlyImageUsage(shopDomain) {
  const now = new Date();
  const cycleEnd = new Date(now);
  cycleEnd.setDate(cycleEnd.getDate() + 30);

  const { data, error } = await supabase
    .from('shopify_shops')
    .update({
      images_used_month: 0,
      last_billed_images: 0,
      billing_cycle_start: now.toISOString(),
      billing_cycle_end: cycleEnd.toISOString(),
      updated_at: now.toISOString()
    })
    .eq('shop_domain', shopDomain)
    .select()
    .single();

  if (error) {
    console.error('Erro ao resetar contador mensal:', error);
    throw new Error('Falha ao resetar contador de imagens');
  }

  return data;
}

/**
 * Verifica se a loja está no plano Enterprise (que não usa billing automático)
 * @param {string} shopDomain - Domínio da loja
 * @returns {Promise<boolean>} true se for Enterprise
 */
export async function isEnterprisePlan(shopDomain) {
  const shop = await getShopBilling(shopDomain);
  return shop && shop.plan === 'enterprise';
}
