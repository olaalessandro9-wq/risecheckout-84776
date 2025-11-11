import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WebhookPayload {
  event_id: string;
  event_type: string;
  created_at: string;
  data: {
    order: {
      id: string;
      status: string;
      amount_cents: number;
      currency: string;
      paid_at?: string;
      created_at: string;
      gateway: string;
      payment_method?: string;
    };
    customer: {
      name?: string;
      email?: string;
    };
    product: {
      id: string;
      name: string;
      description?: string;
      price: number;
    };
  };
}

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

    // Buscar dados completos do pedido
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .select(`
        *,
        product:products (
          id,
          name,
          description,
          price
        )
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
    const { data: webhooks, error: webhooksError } = await supabaseClient
      .from("outbound_webhooks")
      .select("*")
      .eq("vendor_id", order.vendor_id)
      .eq("product_id", order.product_id)
      .eq("active", true)
      .contains("events", [event_type]);

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

    // Construir payload do webhook
    const event_id = `evt_${crypto.randomUUID()}`;
    const payload: WebhookPayload = {
      event_id,
      event_type,
      created_at: new Date().toISOString(),
      data: {
        order: {
          id: order.id,
          status: order.status,
          amount_cents: order.amount_cents,
          currency: order.currency,
          paid_at: order.paid_at,
          created_at: order.created_at,
          gateway: order.gateway,
          payment_method: order.payment_method,
        },
        customer: {
          name: order.customer_name,
          email: order.customer_email,
        },
        product: {
          id: order.product.id,
          name: order.product.name,
          description: order.product.description,
          price: order.product.price,
        },
      },
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
            "X-Rise-Event-Id": event_id,
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
        event_id,
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
