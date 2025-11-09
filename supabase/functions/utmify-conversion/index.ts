import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UTMifyOrder {
  orderId: string;
  platform: string;
  paymentMethod: string;
  status: string;
  createdAt: string;
  approvedDate: string | null;
  refundedAt: string | null;
  customer: {
    name: string;
    email: string;
    phone: string | null;
    document: string | null;
    country: string;
    ip: string;
  };
  products: Array<{
    id: string;
    name: string;
    planId: string | null;
    planName: string | null;
    quantity: number;
    priceInCents: number;
  }>;
  trackingParameters: {
    src: string | null;
    sck: string | null;
    utm_source: string | null;
    utm_campaign: string | null;
    utm_medium: string | null;
    utm_content: string | null;
    utm_term: string | null;
  };
  commission: {
    totalPriceInCents: number;
    gatewayFeeInCents: number;
    userCommissionInCents: number;
    currency: string;
  };
  isTest: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { vendorId, orderData } = await req.json()

    console.log('[UTMify] Processando conversão para vendor:', vendorId)

    // Buscar integração da UTMify do vendedor
    const { data: integration, error: integrationError } = await supabaseClient
      .from('vendor_integrations')
      .select('*')
      .eq('vendor_id', vendorId)
      .eq('integration_type', 'UTMIFY')
      .eq('active', true)
      .maybeSingle()

    if (integrationError) {
      console.error('[UTMify] Erro ao buscar integração:', integrationError)
      throw integrationError
    }

    if (!integration) {
      console.log('[UTMify] Integração não encontrada ou inativa para vendor:', vendorId)
      return new Response(
        JSON.stringify({ success: false, message: 'Integração UTMify não configurada' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const apiToken = integration.config?.api_token

    if (!apiToken) {
      console.error('[UTMify] Token não configurado')
      return new Response(
        JSON.stringify({ success: false, message: 'Token da UTMify não configurado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Preparar dados para envio à UTMify
    const utmifyPayload: UTMifyOrder = {
      orderId: orderData.orderId,
      platform: "RiseCheckout",
      paymentMethod: orderData.paymentMethod || "pix",
      status: orderData.status || "waiting_payment",
      createdAt: orderData.createdAt,
      approvedDate: orderData.approvedDate || null,
      refundedAt: orderData.refundedAt || null,
      customer: {
        name: orderData.customer.name,
        email: orderData.customer.email,
        phone: orderData.customer.phone || null,
        document: orderData.customer.document || null,
        country: orderData.customer.country || "BR",
        ip: orderData.customer.ip || "0.0.0.0"
      },
      products: orderData.products.map((product: any) => ({
        id: product.id,
        name: product.name,
        planId: product.planId || null,
        planName: product.planName || null,
        quantity: product.quantity || 1,
        priceInCents: product.priceInCents
      })),
      trackingParameters: {
        src: orderData.trackingParameters?.src || null,
        sck: orderData.trackingParameters?.sck || null,
        utm_source: orderData.trackingParameters?.utm_source || null,
        utm_campaign: orderData.trackingParameters?.utm_campaign || null,
        utm_medium: orderData.trackingParameters?.utm_medium || null,
        utm_content: orderData.trackingParameters?.utm_content || null,
        utm_term: orderData.trackingParameters?.utm_term || null
      },
      commission: {
        totalPriceInCents: orderData.commission?.totalPriceInCents || orderData.totalPriceInCents,
        gatewayFeeInCents: orderData.commission?.gatewayFeeInCents || 0,
        userCommissionInCents: orderData.commission?.userCommissionInCents || orderData.totalPriceInCents,
        currency: orderData.commission?.currency || "BRL"
      },
      isTest: orderData.isTest || false
    }

    console.log('[UTMify] Enviando conversão:', JSON.stringify(utmifyPayload, null, 2))

    // Enviar para a API da UTMify
    const utmifyResponse = await fetch('https://api.utmify.com.br/api-credentials/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-token': apiToken
      },
      body: JSON.stringify(utmifyPayload)
    })

    const responseText = await utmifyResponse.text()
    console.log('[UTMify] Resposta da API:', utmifyResponse.status, responseText)

    if (!utmifyResponse.ok) {
      console.error('[UTMify] Erro na resposta da API:', utmifyResponse.status, responseText)
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Erro ao enviar conversão para UTMify',
          details: responseText 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    console.log('[UTMify] Conversão enviada com sucesso')

    return new Response(
      JSON.stringify({ success: true, message: 'Conversão enviada com sucesso' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('[UTMify] Erro:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})
