import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://wivbtmtgpsxupfjwwovf.supabase.co",
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

    const { delivery_id, webhook_url, payload } = await req.json();

    // Validar inputs
    if (!delivery_id || !webhook_url || !payload) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Sending webhook:", {
      delivery_id,
      webhook_url,
      event: payload.event,
    });

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
      console.error("Error sending webhook:", e);
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
          response_body: responseBody.substring(0, 1000), // Limitar tamanho
          attempts: 1,
          last_attempt_at: new Date().toISOString(),
        })
        .eq("id", delivery_id);

      console.log("Webhook sent successfully:", {
        delivery_id,
        status: response.status,
        duration: `${duration}ms`,
      });

      return new Response(
        JSON.stringify({
          success: true,
          status: response.status,
          duration,
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
          response_body: (error as Error)?.message || "Failed to send webhook",
          attempts: 1,
          last_attempt_at: new Date().toISOString(),
        })
        .eq("id", delivery_id);

      return new Response(
        JSON.stringify({
          success: false,
          error: (error as Error)?.message || "Failed to send webhook",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("Error in send-webhook function:", error);
    return new Response(
      JSON.stringify({ error: (error as Error)?.message || "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
