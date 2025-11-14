// @ts-ignore
// deno-lint-ignore-file
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.46.1";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://risecheckout.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

/**
 * Reenvia webhooks pendentes ou com falha
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[retry-webhooks] Iniciando retry de webhooks pendentes...");

    // Buscar webhooks pendentes ou com falha
    const { data: pendingWebhooks, error: fetchError } = await supabase
      .from("webhook_deliveries")
      .select(`
        id,
        order_id,
        webhook_id,
        event_type,
        payload,
        status,
        attempts,
        created_at
      `)
      .in("status", ["pending", "failed"])
      .order("created_at", { ascending: true })
      .limit(50); // Limite de 50 por execução

    if (fetchError) {
      console.error("[retry-webhooks] Erro ao buscar webhooks:", fetchError);
      throw fetchError;
    }

    if (!pendingWebhooks || pendingWebhooks.length === 0) {
      console.log("[retry-webhooks] Nenhum webhook pendente encontrado");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Nenhum webhook pendente",
          retried: 0
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[retry-webhooks] Encontrados ${pendingWebhooks.length} webhooks pendentes`);

    const results = {
      total: pendingWebhooks.length,
      success: 0,
      failed: 0,
      errors: [] as any[]
    };

    // Processar cada webhook
    for (const webhook of pendingWebhooks) {
      try {
        console.log(`[retry-webhooks] Processando webhook ${webhook.id} (order: ${webhook.order_id})`);

        // Buscar webhook URL
        const { data: webhookConfig } = await supabase
          .from("outbound_webhooks")
          .select("url, events")
          .eq("id", webhook.webhook_id)
          .eq("active", true)
          .single();

        if (!webhookConfig) {
          console.log(`[retry-webhooks] Webhook config não encontrado para webhook_id ${webhook.webhook_id}`);
          results.failed++;
          continue;
        }

        // Verificar se o evento está habilitado
        const events = webhookConfig.events || [];
        if (!events.includes(webhook.event_type)) {
          console.log(`[retry-webhooks] Evento ${webhook.event_type} não habilitado`);
          results.failed++;
          continue;
        }

        // Atualizar tentativas
        const newAttempts = (webhook.attempts || 0) + 1;

        // Enviar webhook
        console.log(`[retry-webhooks] Enviando para ${webhookConfig.url}`);
        
        const response = await fetch(webhookConfig.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "RiseCheckout-Webhook/1.0"
          },
          body: JSON.stringify(webhook.payload)
        });

        const responseStatus = response.status;
        const responseBody = await response.text().catch(() => "");

        console.log(`[retry-webhooks] Response: ${responseStatus}`);

        // Atualizar registro
        const newStatus = responseStatus >= 200 && responseStatus < 300 ? "success" : "failed";

        await supabase
          .from("webhook_deliveries")
          .update({
            status: newStatus,
            attempts: newAttempts,
            response_status: responseStatus,
            response_body: responseBody.substring(0, 1000),
            last_attempt_at: new Date().toISOString()
          })
          .eq("id", webhook.id);

        if (newStatus === "success") {
          results.success++;
        } else {
          results.failed++;
          results.errors.push({
            webhook_id: webhook.id,
            order_id: webhook.order_id,
            status: responseStatus,
            error: responseBody.substring(0, 200)
          });
        }

      } catch (error) {
        console.error(`[retry-webhooks] Erro ao processar webhook ${webhook.id}:`, error);
        results.failed++;
        results.errors.push({
          webhook_id: webhook.id,
          order_id: webhook.order_id,
          error: (error as Error).message
        });

        // Atualizar como failed
        await supabase
          .from("webhook_deliveries")
          .update({
            status: "failed",
            attempts: (webhook.attempts || 0) + 1,
            last_attempt_at: new Date().toISOString()
          })
          .eq("id", webhook.id);
      }
    }

    console.log("[retry-webhooks] Retry concluído:", results);

    return new Response(
      JSON.stringify({
        ...results,
        success: true
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[retry-webhooks] Erro:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
