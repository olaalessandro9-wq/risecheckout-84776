import { supabase } from "@/integrations/supabase/client";

interface PurchaseEventData {
  vendor_id: string;
  order_id: string;
  customer_email: string;
  customer_name?: string;
  customer_phone?: string;
  amount_cents: number;
  currency: string;
  product_id: string;
  product_name: string;
  client_ip_address?: string;
  client_user_agent?: string;
  event_source_url?: string;
}

/**
 * Envia evento de Purchase para a Facebook Conversions API (server-side)
 * Esta função deve ser chamada após a criação bem-sucedida de um pedido
 */
export async function sendPurchaseToFacebookConversionsAPI(data: PurchaseEventData): Promise<void> {
  try {
    console.log("[Facebook Conversions API] Sending Purchase event for order:", data.order_id);

    // Separar primeiro e último nome
    const nameParts = (data.customer_name || "").trim().split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    // Preparar dados do evento
    const eventData = {
      email: data.customer_email,
      first_name: firstName,
      last_name: lastName,
      phone: data.customer_phone,
      client_ip_address: data.client_ip_address,
      client_user_agent: data.client_user_agent || navigator.userAgent,
      event_source_url: data.event_source_url || window.location.href,
      custom_data: {
        value: data.amount_cents / 100, // Converter centavos para reais
        currency: data.currency,
        content_name: data.product_name,
        content_ids: [data.product_id],
        content_type: "product",
        num_items: 1,
      },
    };

    // Chamar Edge Function
    const { data: response, error } = await supabase.functions.invoke(
      "facebook-conversion-api",
      {
        body: {
          vendor_id: data.vendor_id,
          event_name: "Purchase",
          event_data: eventData,
        },
      }
    );

    if (error) {
      console.error("[Facebook Conversions API] Error:", error);
      // Não lançar erro para não interromper o fluxo de checkout
      return;
    }

    console.log("[Facebook Conversions API] Success:", response);
  } catch (error) {
    console.error("[Facebook Conversions API] Exception:", error);
    // Não lançar erro para não interromper o fluxo de checkout
  }
}

/**
 * Envia evento de InitiateCheckout para a Facebook Conversions API (server-side)
 */
export async function sendInitiateCheckoutToFacebookConversionsAPI(
  vendor_id: string,
  customer_email: string,
  customer_name: string,
  product_id: string,
  product_name: string,
  amount_cents: number
): Promise<void> {
  try {
    console.log("[Facebook Conversions API] Sending InitiateCheckout event");

    const nameParts = customer_name.trim().split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    const eventData = {
      email: customer_email,
      first_name: firstName,
      last_name: lastName,
      client_user_agent: navigator.userAgent,
      event_source_url: window.location.href,
      custom_data: {
        value: amount_cents / 100,
        currency: "BRL",
        content_name: product_name,
        content_ids: [product_id],
        content_type: "product",
        num_items: 1,
      },
    };

    await supabase.functions.invoke("facebook-conversion-api", {
      body: {
        vendor_id,
        event_name: "InitiateCheckout",
        event_data: eventData,
      },
    });
  } catch (error) {
    console.error("[Facebook Conversions API] Exception:", error);
  }
}
