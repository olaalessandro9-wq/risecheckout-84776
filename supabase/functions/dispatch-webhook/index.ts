import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verificar autenticação - APENAS service_role pode chamar
    const authHeader = req.headers.get("authorization");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!authHeader || !authHeader.includes(serviceRoleKey || "")) {
      console.error("[dispatch-webhook] Unauthorized access attempt");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { webhook_id, webhook_url, order_id, event_type, payload } = await req.json();

    // Validar inputs
    if (!webhook_id || !webhook_url || !order_id || !event_type || !payload) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("[dispatch-webhook] Disparando webhook:", {
      webhook_id,
      webhook_url,
      order_id,
      event_type
    });

    // Inserir registro de entrega
    const { data: delivery, error: deliveryError } = await supabase
      .from("webhook_deliveries")
      .insert({
        webhook_id,
        order_id,
        event_type,
        payload,
        status: "pending",
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (deliveryError) {
      console.error("[dispatch-webhook] Erro ao criar delivery:", deliveryError);
      return new Response(
        JSON.stringify({ error: deliveryError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Enviar webhook para o destino
    const startTime = Date.now();
    let response;
    let error = null;

    try {
      response = await fetch(webhook_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      error = e as Error;
      console.error("[dispatch-webhook] Erro ao enviar:", e);
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Atualizar status na tabela webhook_deliveries
    if (response) {
      const responseBody = await response.text();
      const status = response.ok ? "success" : "failed";

      await supabase
        .from("webhook_deliveries")
        .update({
          status,
          response_status: response.status,
          response_body: responseBody.substring(0, 1000),
          attempts: 1,
          last_attempt_at: new Date().toISOString(),
        })
        .eq("id", delivery.id);

      console.log("[dispatch-webhook] Resposta:", response.status, responseBody.substring(0, 100));

      return new Response(
        JSON.stringify({
          success: true,
          status_code: response.status,
          log_id: delivery.id,
          duration
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } else {
      // Erro ao enviar
      await supabase
        .from("webhook_deliveries")
        .update({
          status: "failed",
          response_body: error?.message || "Failed to send webhook",
          attempts: 1,
          last_attempt_at: new Date().toISOString(),
        })
        .eq("id", delivery.id);

      return new Response(
        JSON.stringify({
          success: false,
          error: error?.message || "Failed to send webhook",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("[dispatch-webhook] Erro geral:", error);
    return new Response(
      JSON.stringify({ error: (error as Error)?.message || "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
