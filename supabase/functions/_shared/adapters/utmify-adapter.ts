/**
 * Adapter para Utmify v3 - CORRIGIDO
 * 
 * Conforme documentação oficial:
 * https://api.utmify.com.br/api-credentials/orders
 * 
 * Principais correções aplicadas:
 * - Campo priceInCents ao invés de price
 * - Objeto commission completo e obrigatório
 * - Campos customer.country e customer.ip adicionados
 * - Removidos campos customizados (valor, comissao, src no root)
 * - Validação de limite de tempo (7 dias para vendas, 45 dias para reembolsos)
 */

/**
 * Converte data ISO para formato UTC 'YYYY-MM-DD HH:MM:SS'
 */
function toUtcYMDHMS(dateIso: string | null | undefined): string | null {
  if (!dateIso) return null;
  const d = new Date(dateIso);
  if (isNaN(d.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

/**
 * Mapeia status interno para status Utmify
 */
function mapStatus(s: string): string {
  switch (s) {
    case 'pix_pending':
    case 'initiated':
    case 'authorized':
      return 'waiting_payment';
    case 'paid':
      return 'paid';
    case 'declined':
      return 'refused';
    case 'refunded':
      return 'refunded';
    case 'chargeback':
      return 'chargedback';
    case 'canceled':
      return 'refused';
    case 'abandoned':
      return 'abandoned';
    default:
      return 'paid';
  }
}

/**
 * Converte pedido interno para formato Utmify
 * 
 * CONFORME DOCUMENTAÇÃO OFICIAL
 */
export function convertToUtmifyFormat(event: any): any | null {
  const order = event.order;

  // Não enviar eventos de abandono
  if (order.status === 'abandoned') {
    console.log('[Utmify] Skipping abandoned order:', order.id);
    return null;
  }

  // Validação de limite de tempo
  const now = new Date();
  const createdAt = new Date(order.created_at);
  const daysDiff = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

  const statusMapped = mapStatus(order.status);

  // Pedidos normais: máximo 7 dias
  if (['waiting_payment', 'paid', 'refused'].includes(statusMapped)) {
    if (daysDiff > 7) {
      console.warn(`[Utmify] Order ${order.id} too old (${daysDiff} days). Skipping.`);
      return null;
    }
  }

  // Reembolsos e chargebacks: máximo 45 dias
  if (['refunded', 'chargedback'].includes(statusMapped)) {
    if (daysDiff > 45) {
      console.warn(`[Utmify] Refund/chargeback ${order.id} too old (${daysDiff} days). Skipping.`);
      return null;
    }
  }

  const tracking = event.tracking_params ?? order.tracking_params ?? {};

  return {
    orderId: order.id,
    platform: 'checkout-builder',
    paymentMethod: order.payment_method ?? null,
    status: statusMapped,
    createdAt: toUtcYMDHMS(order.created_at),
    approvedDate: toUtcYMDHMS(order.paid_at),
    refundedAt: toUtcYMDHMS(order.refunded_at),
    customer: {
      email: order.customer_email ?? null,
      name: order.customer_name ?? null,
      phone: order.customer_phone ?? null,
      document: order.customer_document ?? null,
      country: "BR", // ISO 3166-1 alfa-2
      ip: order.customer_ip ?? null
    },
    products: order.product_id ? [{
      id: order.product_id,
      name: order.product_name ?? 'Produto',
      quantity: 1,
      priceInCents: order.amount_cents // ✅ CORRIGIDO: em centavos
    }] : undefined,
    trackingParameters: tracking,
    commission: { // ✅ ADICIONADO: objeto obrigatório
      totalPriceInCents: order.amount_cents,
      gatewayFeeInCents: 0,
      userCommissionInCents: order.amount_cents, // Produtor recebe 100%
      currency: "BRL"
    },
    isTest: !!order.is_test
    // ❌ REMOVIDOS: valor, comissao, src (campos não documentados)
  };
}

/**
 * Envia pedido para Utmify
 */
export async function sendOrderToUtmify(payload: any, apiToken: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Idempotency-Key para evitar duplicidade
    const idempotencyKey = `${payload.orderId}-${payload.status}-${payload.approvedDate ?? 'na'}`;

    console.log('[Utmify] Sending order:', payload.orderId);
    console.log('[Utmify] Payload:', JSON.stringify(payload, null, 2));

    const response = await fetch('https://api.utmify.com.br/api-credentials/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-token': apiToken,
        'Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Utmify] Error:', response.status, errorText);
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    const responseText = await response.text();
    console.log('[Utmify] Order sent successfully:', payload.orderId, responseText);
    return { success: true };

  } catch (error) {
    console.error('[Utmify] Exception:', error);
    return { success: false, error: String(error) };
  }
}
