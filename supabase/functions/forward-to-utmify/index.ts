import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { convertToUtmifyFormat, sendOrderToUtmify } from '../_shared/adapters/utmify-adapter.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

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
        customer_ip: order.customer_ip, // ✅ ADICIONADO
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
