import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { webhook_id, webhook_url, event_type, payload } = await req.json();

    if (!webhook_url || !event_type || !payload) {
      throw new Error("webhook_url, event_type and payload are required");
    }

    // Buscar o secret do webhook
    const { data: webhook, error: webhookError } = await supabaseClient
      .from("outbound_webhooks")
      .select("secret")
      .eq("id", webhook_id)
      .single();

    if (webhookError) {
      console.error("Error fetching webhook:", webhookError);
    }

    // Gerar assinatura HMAC
    const signature = webhook?.secret 
      ? await generateSignature(JSON.stringify(payload), webhook.secret)
      : "";

    // Enviar webhook
    const response = await fetch(webhook_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Rise-Signature": signature,
        "X-Rise-Event": event_type,
        "X-Rise-Test": "true",
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();

    // Registrar entrega (opcional para testes)
    if (webhook_id) {
      await supabaseClient.from("webhook_deliveries").insert({
        webhook_id: webhook_id,
        order_id: null, // Teste não tem order_id real
        event_type: event_type,
        payload: payload,
        status_code: response.status,
        response_body: responseText,
        delivered_at: new Date().toISOString(),
      });
    }

    return new Response(
      JSON.stringify({
        success: response.ok,
        status_code: response.status,
        response_body: responseText,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function generateSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(payload);

  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, messageData);
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
