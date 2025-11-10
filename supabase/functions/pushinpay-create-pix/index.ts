import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, valueInCents } = await req.json();

    console.log("[pushinpay-create-pix] Criando PIX:", { orderId, valueInCents });

    // Validações
    if (!orderId || !valueInCents) {
      return new Response(
        JSON.stringify({ ok: false, error: "orderId e valueInCents são obrigatórios" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    if (valueInCents < 50) {
      return new Response(
        JSON.stringify({ ok: false, error: "Valor mínimo é 50 centavos" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Criar cliente Supabase
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Buscar pedido para obter vendor_id
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .select("vendor_id")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error("[pushinpay-create-pix] Erro ao buscar pedido:", orderError);
      return new Response(
        JSON.stringify({ ok: false, error: "Pedido não encontrado" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Buscar token da PushinPay do vendor
    const { data: vendorData, error: vendorError } = await supabaseClient
      .from("vendors")
      .select("pushinpay_token, environment")
      .eq("id", order.vendor_id)
      .single();

    if (vendorError || !vendorData?.pushinpay_token) {
      console.error("[pushinpay-create-pix] Erro ao buscar configurações:", vendorError);
      return new Response(
        JSON.stringify({ ok: false, error: "Configurações da PushinPay não encontradas" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Determinar URL da API baseado no ambiente
    const environment = vendorData.environment || "production";
    const apiUrl = environment === "sandbox"
      ? "https://api-sandbox.pushinpay.com.br/api"
      : "https://api.pushinpay.com.br/api";

    console.log("[pushinpay-create-pix] Usando ambiente:", environment, "URL:", apiUrl);

    // Criar PIX na PushinPay
    const pushinpayResponse = await fetch(`${apiUrl}/pix/cashIn`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${vendorData.pushinpay_token}`,
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        value: valueInCents,
        webhook_url: null, // Por enquanto sem webhook
        split_rules: [],
      }),
    });

    if (!pushinpayResponse.ok) {
      const errorText = await pushinpayResponse.text();
      console.error("[pushinpay-create-pix] Erro da PushinPay:", errorText);
      return new Response(
        JSON.stringify({ ok: false, error: `Erro da PushinPay: ${errorText}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: pushinpayResponse.status }
      );
    }

    const pixData = await pushinpayResponse.json();
    console.log("[pushinpay-create-pix] PIX criado com sucesso:", { id: pixData.id, status: pixData.status });

    // Salvar dados do PIX no pedido
    const { error: updateError } = await supabaseClient
      .from("orders")
      .update({
        pix_id: pixData.id,
        pix_qr_code: pixData.qr_code,
        pix_status: pixData.status,
        pix_created_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (updateError) {
      console.error("[pushinpay-create-pix] Erro ao atualizar pedido:", updateError);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        pix: {
          id: pixData.id,
          pix_id: pixData.id,
          qr_code: pixData.qr_code,
          qrcode: pixData.qr_code,
          emv: pixData.qr_code,
          status: pixData.status,
          qr_code_base64: pixData.qr_code_base64,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[pushinpay-create-pix] Erro inesperado:", error);
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
