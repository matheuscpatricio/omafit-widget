/**
 * POST /api/billing/usage
 *
 * Registra uso de imagens e cria cobrança automática se necessário
 *
 * Body esperado:
 * {
 *   "shopDomain": "minha-loja.myshopify.com",
 *   "imagesCount": 1
 * }
 *
 * Retorna:
 * {
 *   "success": true,
 *   "billed": true,
 *   "amount": 0.17,
 *   "currency": "USD",
 *   "imagesCount": 1,
 *   "message": "..."
 * }
 */

import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';
import { registerImageUsageAndBill } from '../utils/usage-billing.server';

export const action = async ({ request }) => {
  try {
    // Autenticar com Shopify
    const { admin } = await authenticate.admin(request);

    // Parse do body
    const body = await request.json();
    const { shopDomain, imagesCount = 1 } = body;

    if (!shopDomain) {
      return json({ error: 'shopDomain é obrigatório' }, { status: 400 });
    }

    if (typeof imagesCount !== 'number' || imagesCount < 1) {
      return json({ error: 'imagesCount deve ser um número maior que 0' }, { status: 400 });
    }

    console.log(`[API Usage] Registrando ${imagesCount} imagens para ${shopDomain}`);

    // Registrar uso e cobrar se necessário
    const result = await registerImageUsageAndBill(shopDomain, imagesCount, admin);

    return json(result);

  } catch (error) {
    console.error('[API Usage] Erro:', error);
    return json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
};
