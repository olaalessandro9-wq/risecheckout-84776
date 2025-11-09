import { supabase } from "@/integrations/supabase/client";

interface UTMifyOrderData {
  orderId: string;
  paymentMethod?: string;
  status: string;
  createdAt: string;
  approvedDate?: string | null;
  refundedAt?: string | null;
  customer: {
    name: string;
    email: string;
    phone?: string | null;
    document?: string | null;
    country?: string;
    ip?: string;
  };
  products: Array<{
    id: string;
    name: string;
    planId?: string | null;
    planName?: string | null;
    quantity?: number;
    priceInCents: number;
  }>;
  trackingParameters?: {
    src?: string | null;
    sck?: string | null;
    utm_source?: string | null;
    utm_campaign?: string | null;
    utm_medium?: string | null;
    utm_content?: string | null;
    utm_term?: string | null;
  };
  commission?: {
    totalPriceInCents?: number;
    gatewayFeeInCents?: number;
    userCommissionInCents?: number;
    currency?: string;
  };
  totalPriceInCents: number;
  isTest?: boolean;
}

/**
 * Envia conversão para a API da UTMify via Edge Function
 */
export async function sendUTMifyConversion(
  vendorId: string,
  orderData: UTMifyOrderData,
  eventType?: string,
  productId?: string
): Promise<void> {
  try {
    console.log("[UTMify Helper] Enviando conversão para vendor:", vendorId, "Evento:", eventType, "Produto:", productId);

    const { data, error } = await supabase.functions.invoke("utmify-conversion", {
      body: {
        vendorId,
        orderData,
        eventType,
        productId,
      },
    });

    if (error) {
      console.error("[UTMify Helper] Erro ao invocar Edge Function:", error);
      throw error;
    }

    console.log("[UTMify Helper] Resposta da Edge Function:", data);

    if (!data?.success) {
      console.warn("[UTMify Helper] Conversão não foi enviada:", data?.message);
    } else {
      console.log("[UTMify Helper] Conversão enviada com sucesso");
    }
  } catch (error) {
    console.error("[UTMify Helper] Erro ao enviar conversão:", error);
    // Não propagar o erro para não interromper o fluxo de checkout
  }
}

/**
 * Extrai parâmetros UTM da URL
 */
export function extractUTMParameters(url?: string): {
  src: string | null;
  sck: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  utm_medium: string | null;
  utm_content: string | null;
  utm_term: string | null;
} {
  if (!url) {
    url = window.location.href;
  }

  const urlObj = new URL(url);
  const params = urlObj.searchParams;

  return {
    src: params.get("src"),
    sck: params.get("sck"),
    utm_source: params.get("utm_source"),
    utm_campaign: params.get("utm_campaign"),
    utm_medium: params.get("utm_medium"),
    utm_content: params.get("utm_content"),
    utm_term: params.get("utm_term"),
  };
}

/**
 * Formata data para o formato UTC esperado pela UTMify (YYYY-MM-DD HH:MM:SS)
 */
export function formatDateForUTMify(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const hours = String(d.getUTCHours()).padStart(2, "0");
  const minutes = String(d.getUTCMinutes()).padStart(2, "0");
  const seconds = String(d.getUTCSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Converte valor em reais para centavos
 */
export function convertToCents(value: number): number {
  return Math.round(value * 100);
}
