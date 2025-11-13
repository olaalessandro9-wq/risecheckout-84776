import { createClient } from "https://esm.sh/@supabase/supabase-js@2.46.1";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

/**
 * Dispara webhooks para um pedido específico no formato Cakto
 * 
 * @param orderId - ID do pedido
 * @param eventType - Tipo do evento (pix_generated, purchase_approved, etc)
 * @param extraData - Dados extras do evento (ex: pix info)
 */
export async function dispatchWebhook(
  orderId: string,
  eventType: string,
  extraData: any = {}
) {
  console.log(`[dispatchWebhook] Iniciando para evento ${eventType}, order ${orderId}`);

  try {
    // 1. Buscar dados completos do pedido
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        id,
        vendor_id,
        product_id,
        customer_name,
        customer_email,
        amount_cents,
        currency,
        payment_method,
        gateway,
        gateway_payment_id,
        status,
        created_at,
        updated_at,
        paid_at,
        pix_id,
        pix_qr_code,
        pix_status,
        pix_created_at,
        customer_ip
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
      .select("id, name, price, user_id")
      .eq("id", order.product_id)
      .single();

    if (productError || !product) {
      console.error("[dispatchWebhook] Produto não encontrado:", productError);
    }

    // 3. Buscar checkout associado
    const { data: checkout } = await supabase
      .from("checkouts")
      .select("id, slug")
      .eq("product_id", order.product_id)
      .eq("user_id", order.vendor_id)
      .single();

    // 4. Construir payload no formato Cakto
    const totalValueCents = order.amount_cents || 0;
    const productPriceCents = product ? Math.floor(parseFloat(product.price) * 100) : totalValueCents;
    
    const caktoPayload = {
      event: eventType,
      secret: order.vendor_id, // Usado como identificador do vendedor
      data: {
        // Identificação do pedido
        id: order.id,
        refId: order.gateway_payment_id || order.id,
        
        // Dados do cliente
        customer: {
          name: order.customer_name || "",
          email: order.customer_email || "",
          birthDate: null,
          phone: null, // TODO: Adicionar campo phone na tabela orders
          docType: null,
          docNumber: null, // TODO: Adicionar campo customer_document
          address: null,
          shipping: null,
          affiliate: null
        },
        
        // Dados da oferta
        offer: {
          id: product?.id || order.product_id,
          image: null,
          name: product?.name || "Produto não encontrado",
          price: productPriceCents / 100,
          offer_type: "main"
        },
        
        // Dados do produto
        product: {
          name: product?.name || "Produto não encontrado",
          id: product?.id || order.product_id,
          short_id: null,
          supportEmail: null,
          type: "unique",
          invoiceDescription: null,
          checkout: checkout?.id || null,
          parent_order: null,
          subscription: null,
          subscription_period: null,
          checkoutUrl: checkout?.slug ? `https://risecheckout.com/pay/${checkout.slug}` : null,
          status: order.status || "pending",
          baseAmount: productPriceCents / 100,
          discount: 0.00
        },
        
        // Valores
        amount: totalValueCents / 100,
        commissions: [], // TODO: Implementar sistema de comissões
        fees: 0, // TODO: Calcular taxas
        couponCode: null, // TODO: Adicionar sistema de cupons
        reason: null,
        refund_reason: null,
        
        // Pagamento
        paymentMethod: order.payment_method || "pix",
        paymentMethodName: (order.payment_method || "pix").toUpperCase(),
        installments: 1,
        
        // UTM (tracking)
        utm_source: null, // TODO: Adicionar campos UTM na tabela orders
        utm_medium: null,
        utm_campaign: null,
        utm_term: null,
        utm_content: null,
        sck: null,
        fbc: null,
        fbp: null,
        
        // Datas
        createdAt: order.created_at,
        due_date: null,
        paidAt: order.paid_at || null,
        refundedAt: null,
        chargedbackAt: null,
        canceledAt: null,
        
        // PIX (se disponível)
        ...(order.pix_qr_code && {
          pix: {
            qrCode: order.pix_qr_code,
            user_journey: null,
            expirationDate: null // TODO: Calcular data de expiração (geralmente +15min)
          }
        }),
        
        // Dados extras do evento (ex: pix info de pix_generated)
        ...extraData
      }
    };

    console.log("[dispatchWebhook] Payload Cakto construído:", JSON.stringify(caktoPayload, null, 2));

    // 5. Buscar webhooks ativos do vendedor
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

    // 6. Filtrar webhooks que escutam este evento
    const relevantWebhooks = webhooks.filter(wh => 
      wh.events && wh.events.includes(eventType)
    );

    if (relevantWebhooks.length === 0) {
      console.log(`[dispatchWebhook] Nenhum webhook configurado para evento ${eventType}`);
      return;
    }

    console.log(`[dispatchWebhook] Enviando para ${relevantWebhooks.length} webhook(s)`);

    // 7. Disparar webhook para cada URL configurada
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
              payload: caktoPayload
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
