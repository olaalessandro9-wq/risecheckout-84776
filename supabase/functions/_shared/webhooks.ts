import { createClient } from "https://esm.sh/@supabase/supabase-js@2.46.1";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

/**
 * Dispara webhooks para um pedido específico
 * 
 * @param orderId - ID do pedido
 * @param eventType - Tipo do evento (pix_generated, purchase_approved, etc)
 * @param payload - Dados do evento
 */
export async function dispatchWebhook(
  orderId: string,
  eventType: string,
  payload: any
) {
  console.log(`[dispatchWebhook] Iniciando para evento ${eventType}, order ${orderId}`);

  try {
    // 1. Buscar vendor_id do pedido
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("vendor_id, product_id")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error("[dispatchWebhook] Pedido não encontrado:", orderError);
      return;
    }

    console.log(`[dispatchWebhook] Pedido encontrado, vendor_id: ${order.vendor_id}`);

    // 2. Buscar webhooks ativos do vendedor
    const { data: webhooks, error: webhooksError } = await supabase
      .from("outbound_webhooks")
      .select("id, url, events")
      .eq("vendor_id", order.vendor_id)
      .eq("active", true);

    if (webhooksError) {
      console.error("[dispatchWebhook] Erro ao buscar webhooks:", webhooksError);
      return;
    }

    if (!webhooks || webhooks.length === 0) {
      console.log("[dispatchWebhook] Nenhum webhook configurado para este vendedor");
      return;
    }

    console.log(`[dispatchWebhook] Encontrados ${webhooks.length} webhook(s) ativos`);

    // 3. Filtrar webhooks que escutam este evento
    const relevantWebhooks = webhooks.filter(wh => 
      wh.events && wh.events.includes(eventType)
    );

    if (relevantWebhooks.length === 0) {
      console.log(`[dispatchWebhook] Nenhum webhook configurado para evento ${eventType}`);
      return;
    }

    console.log(`[dispatchWebhook] Enviando para ${relevantWebhooks.length} webhook(s)`);

    // 4. Disparar webhook para cada URL configurada
    const dispatchPromises = relevantWebhooks.map(async (webhook) => {
      try {
        console.log(`[dispatchWebhook] Enviando para webhook ${webhook.id} (${webhook.url})`);
        
        const response = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/dispatch-webhook`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
            },
            body: JSON.stringify({
              webhook_id: webhook.id,
              webhook_url: webhook.url,
              order_id: orderId,
              event_type: eventType,
              payload: payload
            })
          }
        );

        const result = await response.json();
        console.log(`[dispatchWebhook] Webhook ${webhook.id} enviado:`, result);
        return result;
      } catch (error) {
        console.error(`[dispatchWebhook] Erro ao enviar webhook ${webhook.id}:`, error);
        return { error: (error as Error).message };
      }
    });

    // Aguardar todos os envios
    const results = await Promise.allSettled(dispatchPromises);
    console.log(`[dispatchWebhook] Concluído: ${results.length} webhook(s) processados`);
    
  } catch (error) {
    console.error("[dispatchWebhook] Erro geral:", error);
  }
}
