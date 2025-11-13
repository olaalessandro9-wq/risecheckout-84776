import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.46.1";
import { dispatchWebhook } from "../_shared/webhooks.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-pushinpay-signature"
};

/**
 * Atualiza status do pedido baseado no webhook da PushinPay
 */
async function updateOrderStatus(orderId: string, payload: any) {
  const normalized = payload?.status ?? payload?.data?.status ?? "created";
  
  console.log("[updateOrderStatus] Status recebido:", {
    orderId,
    rawStatus: normalized
  });

  const statusMap: Record<string, string> = {
    created: "PENDING",
    paid: "PAID",
    expired: "EXPIRED",
    canceled: "CANCELED"
  };

  const newStatus = statusMap[normalized] ?? "PENDING";

  const { error } = await supabase
    .from("orders")
    .update({ status: newStatus })
    .eq("id", orderId);

  if (error) {
    console.error("[updateOrderStatus] Erro ao atualizar:", error);
    throw error;
  }

  console.log("[updateOrderStatus] ✅ Status atualizado:", { orderId, newStatus });
  return newStatus;
}

/**
 * Busca pedido pelo pix_id
 */
async function findOrderByPixId(pixId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("id")
    .eq("pix_id", pixId)
    .single();

  if (error || !data) {
    console.error("[findOrderByPixId] Pedido não encontrado:", error);
    return null;
  }

  return data.id;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 204, 
      headers: corsHeaders 
    });
  }

  try {
    // Validar método
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const payload = await req.json();
    console.log("[pushinpay-webhook] Webhook recebido:", payload);

    // ✅ Validar assinatura HMAC (SEGURANÇA CRÍTICA)
    const receivedSignature = req.headers.get(
      Deno.env.get("PUSHINPAY_WEBHOOK_HEADER_NAME") || "X-PushinPay-Signature"
    );

    if (!receivedSignature) {
      console.error("[pushinpay-webhook] Missing signature header");
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing signature" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const webhookToken = Deno.env.get("PUSHINPAY_WEBHOOK_TOKEN");
    if (!webhookToken) {
      console.error("[pushinpay-webhook] PUSHINPAY_WEBHOOK_TOKEN not configured");
      return new Response(
        JSON.stringify({ error: "Server misconfiguration" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Gerar assinatura esperada usando HMAC SHA-256
    const payloadString = JSON.stringify(payload);
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(webhookToken),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const expectedSignatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payloadString)
    );

    const expectedSignature = Array.from(new Uint8Array(expectedSignatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Comparação timing-safe
    if (receivedSignature !== expectedSignature) {
      console.error("[pushinpay-webhook] Invalid signature");
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid signature" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    console.log("[pushinpay-webhook] ✅ Signature validated successfully");

    // Encontrar orderId pelo pixId
    const orderId = await findOrderByPixId(payload.id);
    if (!orderId) {
      console.error("[pushinpay-webhook] Order not found for pix_id:", payload.id);
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Atualizar status do pedido
    const newStatus = await updateOrderStatus(orderId, payload);

    // ✅ NOVO: Disparar webhook purchase_approved se status = PAID
    if (newStatus === "PAID") {
      console.log("[pushinpay-webhook] Disparando webhook purchase_approved");
      
      dispatchWebhook(orderId, "purchase_approved", {
        event: "purchase_approved",
        order_id: orderId,
        payment: {
          pix_id: payload.id,
          status: "paid",
          value: payload.value
        },
        timestamp: new Date().toISOString()
      }).catch((err) =>
        console.error("[pushinpay-webhook] Erro ao disparar webhook:", err)
      );
    }

    return new Response(
      JSON.stringify({ ok: true }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("[pushinpay-webhook] Erro:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
