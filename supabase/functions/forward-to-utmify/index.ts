import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

/**
 * Adapter para Utmify v3 - CORRIGIDO
 * Conforme documentação oficial: https://api.utmify.com.br/api-credentials/orders
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
 */
function convertToUtmifyFormat(event: any): any | null {
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
  };
}

/**
 * Envia pedido para Utmify
 */
async function sendOrderToUtmify(payload: any, apiToken: string): Promise<{ success: boolean; error?: string }> {
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

// Edge Function Handler
serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse body
    const { orderId } = await req.json();
    
    if (!orderId) {
      return new Response(JSON.stringify({ error: 'orderId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl!, supabaseKey!);

    console.log('[Utmify] Processing order:', orderId);

    // Buscar pedido com dados do produto
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        products (
          id,
          name
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('[Utmify] Order not found:', orderId, orderError);
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Buscar integração Utmify do vendedor
    const { data: integration, error: integrationError } = await supabase
      .from('vendor_integrations')
      .select('*')
      .eq('vendor_id', order.vendor_id)
      .eq('integration_type', 'UTMIFY')
      .eq('active', true)
      .single();

    if (integrationError || !integration) {
      console.log('[Utmify] No active integration for vendor:', order.vendor_id);
      return new Response(JSON.stringify({ message: 'No active Utmify integration found' }), {
        status: 204,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Pegar API token do config
    const apiToken = integration.config?.api_token;
    
    if (!apiToken) {
      console.error('[Utmify] API token not configured');
      return new Response(JSON.stringify({ error: 'Utmify API token not configured' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Montar evento para o adapter
    const event = {
      order: {
        id: order.id,
        vendor_id: order.vendor_id,
        product_id: order.product_id,
        product_name: order.products?.name || 'Produto',
        amount_cents: order.amount_cents,
        status: order.status,
        payment_method: order.payment_method,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        customer_phone: order.customer_phone,
        customer_document: order.customer_document,
        customer_ip: order.customer_ip,
        created_at: order.created_at,
        paid_at: order.paid_at,
        refunded_at: order.refunded_at,
        is_test: order.is_test,
        tracking_params: order.tracking_params
      },
      type: 'PAYMENT_APPROVED',
      tracking_params: order.tracking_params
    };

    // Converter pedido para formato Utmify
    const utmifyPayload = convertToUtmifyFormat(event);
    
    if (!utmifyPayload) {
      console.log('[Utmify] Order not eligible for Utmify:', order.status);
      return new Response(JSON.stringify({ message: 'Order not eligible for Utmify (e.g., abandoned or too old)' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Enviar para Utmify
    const result = await sendOrderToUtmify(utmifyPayload, apiToken);
    
    if (!result.success) {
      console.error('[Utmify] Failed to send order:', result.error);
      return new Response(JSON.stringify({ error: result.error }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('[Utmify] Order sent successfully:', orderId);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[Utmify] Exception:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
