import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { order_id, event_type } = await req.json();

    console.log("[trigger-webhooks] Processando evento:", { order_id, event_type });

    if (!order_id || !event_type) {
      return new Response(
        JSON.stringify({ ok: false, error: "order_id e event_type são obrigatórios" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Criar cliente Supabase
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Buscar dados completos do pedido com todas as relações
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .select(`
        *,
        product:products (*),
        customer:customers (*)
      `)
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      console.error("[trigger-webhooks] Erro ao buscar pedido:", orderError);
      return new Response(
        JSON.stringify({ ok: false, error: "Pedido não encontrado" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    console.log("[trigger-webhooks] Pedido encontrado:", order.id);

    // Buscar webhooks ativos do vendedor para este evento e produto
    // Incluir webhooks configurados para "Todos os produtos" (product_id = null)
    const { data: webhooks, error: webhooksError } = await supabaseClient
      .from("outbound_webhooks")
      .select("*")
      .eq("vendor_id", order.vendor_id)
      .eq("active", true)
      .contains("events", [event_type])
      .or(`product_id.eq.${order.product_id},product_id.is.null`);

    if (webhooksError) {
      console.error("[trigger-webhooks] Erro ao buscar webhooks:", webhooksError);
      return new Response(
        JSON.stringify({ ok: false, error: "Erro ao buscar webhooks" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    if (!webhooks || webhooks.length === 0) {
      console.log("[trigger-webhooks] Nenhum webhook ativo encontrado para este evento");
      return new Response(
        JSON.stringify({ ok: true, message: "Nenhum webhook configurado para este evento" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[trigger-webhooks] ${webhooks.length} webhook(s) encontrado(s)`);

    // Construir payload completo estilo Cakto
    const payload = {
      // Dados básicos do pedido
      id: order.id,
      status: order.status,
      totalAmount: order.amount_cents / 100, // Converter centavos para reais
      baseAmount: order.amount_cents / 100,
      discount: 0,
      amount: order.amount_cents / 100,
      paymentMethod: order.payment_method || "pix",
      paymentMethodName: order.payment_method === "credit_card" ? "Cartão de Crédito" : 
                         order.payment_method === "boleto" ? "Boleto" :
                         order.payment_method === "pix" ? "PIX" : "PIX",
      paidAt: order.paid_at,
      createdAt: order.created_at,
      due_date: order.due_date || null,
      refundedAt: order.refunded_at || null,
      chargedbackAt: order.chargedback_at || null,
      canceledAt: order.canceled_at || null,
      
      // UTMs
      utm_source: order.utm_source || null,
      utm_medium: order.utm_medium || null,
      utm_campaign: order.utm_campaign || null,
      utm_term: order.utm_term || null,
      utm_content: order.utm_content || null,
      sck: order.sck || null,
      fbc: order.fbc || null,
      fbp: order.fbp || null,

      // Dados de pagamento por método
      card: order.payment_method === "credit_card" && order.card_data ? {
        lastDigits: order.card_data.last_digits || null,
        holderName: order.card_data.holder_name || null,
        brand: order.card_data.brand || null,
      } : null,

      boleto: order.payment_method === "boleto" && order.boleto_data ? {
        barcode: order.boleto_data.barcode || null,
        boletoUrl: order.boleto_data.url || null,
        expirationDate: order.boleto_data.expiration_date || null,
      } : null,

      pix: order.payment_method === "pix" && order.pix_data ? {
        expirationDate: order.pix_data.expiration_date || null,
        qrCode: order.pix_data.qr_code || null,
      } : null,

      picpay: order.payment_method === "picpay" && order.picpay_data ? {
        qrCode: order.picpay_data.qr_code || null,
        paymentURL: order.picpay_data.payment_url || null,
        expirationDate: order.picpay_data.expiration_date || null,
      } : null,

      // Dados do cliente
      customer: order.customer ? {
        name: order.customer.name || order.customer_name,
        email: order.customer.email || order.customer_email,
        phone: order.customer.phone || null,
        docNumber: order.customer.document_number || null,
        birthDate: order.customer.birth_date || null,
        docType: order.customer.document_type || "cpf",
        address: order.customer.address ? {
          street: order.customer.address.street || null,
          number: order.customer.address.number || null,
          complement: order.customer.address.complement || null,
          neighborhood: order.customer.address.neighborhood || null,
          city: order.customer.address.city || null,
          state: order.customer.address.state || null,
          zipCode: order.customer.address.zip_code || null,
        } : null,
        shipping: null,
        affiliate: order.customer.affiliate || null,
      } : {
        name: order.customer_name || null,
        email: order.customer_email || null,
        phone: null,
        docNumber: null,
        birthDate: null,
        docType: "cpf",
        address: null,
        shipping: null,
        affiliate: null,
      },

      // Dados do produto
      product: order.product ? {
        name: order.product.name,
        id: order.product.id,
        short_id: order.product.short_id || null,
        supportEmail: order.product.support_email || null,
        type: order.product.type || "unique",
        invoiceDescription: order.product.description || null,
      } : null,

      // Dados de comissões (se houver)
      commissions: order.commissions || [],
      fees: order.fees || 0,
      couponCode: order.coupon_code || null,
      reason: order.refund_reason || null,
      refund_reason: order.refund_reason || null,
      installments: order.installments || 1,

      // Dados de assinatura (se houver)
      subscription: order.subscription_id ? {
        id: order.subscription_id,
        status: order.subscription_status || "active",
        current_period: order.subscription_current_period || 1,
        recurrence_period: order.subscription_recurrence_period || 30,
        quantity_recurrences: order.subscription_quantity_recurrences || 0,
        trial_days: order.subscription_trial_days || 1,
        max_retries: order.subscription_max_retries || 3,
        amount: order.amount_cents / 100,
        retry_interval: order.subscription_retry_interval || 1,
        paid_payments_quantity: order.subscription_paid_payments || 1,
        retention: order.subscription_retention || "00:0:00",
        parent_order: order.parent_order_id || null,
      } : null,

      // Dados de pedidos relacionados (se for assinatura)
      orders: order.subscription_id ? [{
        id: order.id,
        next_payment_date: order.next_payment_date || null,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        canceledAt: order.canceled_at || null,
      }] : [],

      // Dados de oferta/bump
      offer: order.offer_id ? {
        id: order.offer_id,
        name: order.offer_name || "Special Offer",
        price: order.offer_price || 10,
        image: null,
        offer_type: "main",
      } : null,

      // Checkout e URLs
      checkout: order.checkout_id || null,
      checkoutUrl: order.checkout_url || null,
      subscription_period: order.subscription_period || 1,
      parent_order: order.parent_order_id || null,

      // Webhooks
      webhookUrl: webhooks[0]?.url || null,
      executionMode: "production",
    };

    const payloadString = JSON.stringify(payload);
    const results = [];

    // Enviar webhook para cada endpoint configurado
    for (const webhook of webhooks) {
      try {
        console.log(`[trigger-webhooks] Enviando webhook para: ${webhook.url}`);

        // Gerar assinatura HMAC-SHA256
        const signature = createHmac("sha256", webhook.secret)
          .update(payloadString)
          .digest("hex");

        // Enviar requisição POST
        const startTime = Date.now();
        const response = await fetch(webhook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Rise-Signature": signature,
            "X-Rise-Event": event_type,
            "User-Agent": "RiseCheckout-Webhooks/1.0",
          },
          body: payloadString,
        });

        const responseTime = Date.now() - startTime;
        const responseBody = await response.text();

        console.log(`[trigger-webhooks] Resposta recebida: ${response.status} (${responseTime}ms)`);

        // Registrar entrega
        const deliveryStatus = response.ok ? "success" : "failed";
        const { error: deliveryError } = await supabaseClient
          .from("webhook_deliveries")
          .insert({
            webhook_id: webhook.id,
            order_id: order.id,
            event_type,
            payload,
            status: deliveryStatus,
            attempts: 1,
            response_status: response.status,
            response_body: responseBody.substring(0, 1000), // Limitar tamanho
            last_attempt_at: new Date().toISOString(),
          });

        if (deliveryError) {
          console.error("[trigger-webhooks] Erro ao registrar entrega:", deliveryError);
        }

        results.push({
          webhook_id: webhook.id,
          url: webhook.url,
          status: deliveryStatus,
          response_status: response.status,
        });

      } catch (error) {
        console.error(`[trigger-webhooks] Erro ao enviar webhook para ${webhook.url}:`, error);

        // Registrar falha
        await supabaseClient
          .from("webhook_deliveries")
          .insert({
            webhook_id: webhook.id,
            order_id: order.id,
            event_type,
            payload,
            status: "failed",
            attempts: 1,
            response_body: error.message,
            last_attempt_at: new Date().toISOString(),
          });

        results.push({
          webhook_id: webhook.id,
          url: webhook.url,
          status: "failed",
          error: error.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        webhooks_sent: results.length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[trigger-webhooks] Erro inesperado:", error);
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
