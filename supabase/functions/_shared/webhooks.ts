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
    // 1. Buscar dados completos do pedido
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        vendor_id,
        product_id,
        customer_name,
        customer_email,
        total_value_cents,
        pix_id,
        pix_qr_code,
        pix_status
      `)
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error("[dispatchWebhook] Pedido não encontrado:", orderError);
      return;
    }

    console.log(`[dispatchWebhook] Pedido encontrado, vendor_id: ${order.vendor_id}`);

    // 2. Buscar dados do produto principal
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name, price")
      .eq("id", order.product_id)
      .single();

    if (productError || !product) {
      console.error("[dispatchWebhook] Produto não encontrado:", productError);
    }

    // 3. Enriquecer payload com dados completos
    const enrichedPayload = {
      ...payload,
      product_id: order.product_id,
      data: {
        product_name: product?.name || "Produto não encontrado",
        amount_cents: product ? Math.floor(parseFloat(product.price) * 100) : order.total_value_cents,
        is_bump: false,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        ...(payload.pix && {
          pix: payload.pix
        })
      }
    };

    console.log("[dispatchWebhook] Payload enriquecido:", JSON.stringify(enrichedPayload, null, 2));

    // 4. Buscar webhooks ativos do vendedor
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

    // 5. Filtrar webhooks que escutam este evento
    const relevantWebhooks = webhooks.filter(wh => 
      wh.events && wh.events.includes(eventType)
    );

    if (relevantWebhooks.length === 0) {
      console.log(`[dispatchWebhook] Nenhum webhook configurado para evento ${eventType}`);
      return;
    }

    console.log(`[dispatchWebhook] Enviando para ${relevantWebhooks.length} webhook(s)`);

    // 6. Disparar webhook para cada URL configurada
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
              payload: enrichedPayload
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
