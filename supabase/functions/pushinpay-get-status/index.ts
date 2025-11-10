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
    const { orderId } = await req.json();

    console.log("[pushinpay-get-status] Consultando status do pedido:", orderId);

    if (!orderId) {
      return new Response(
        JSON.stringify({ ok: false, error: "orderId é obrigatório" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Criar cliente Supabase
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Buscar pedido
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .select("vendor_id, pix_id, pix_status")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error("[pushinpay-get-status] Erro ao buscar pedido:", orderError);
      return new Response(
        JSON.stringify({ ok: false, error: "Pedido não encontrado" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    if (!order.pix_id) {
      console.log("[pushinpay-get-status] Pedido sem PIX criado ainda");
      return new Response(
        JSON.stringify({ ok: true, status: { status: "created" } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar token da PushinPay do vendor
    const { data: vendorData, error: vendorError } = await supabaseClient
      .from("payment_gateway_settings")
      .select("pushinpay_token, environment")
      .eq("user_id", order.vendor_id)
      .single();

    if (vendorError || !vendorData?.pushinpay_token) {
      console.error("[pushinpay-get-status] Erro ao buscar configurações:", vendorError);
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

    console.log("[pushinpay-get-status] Consultando PIX na PushinPay:", order.pix_id);

    // Consultar status na PushinPay
    const pushinpayResponse = await fetch(`${apiUrl}/transactions/${order.pix_id}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${vendorData.pushinpay_token}`,
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
    });

    if (!pushinpayResponse.ok) {
      const errorText = await pushinpayResponse.text();
      console.error("[pushinpay-get-status] Erro da PushinPay:", errorText);
      return new Response(
        JSON.stringify({ ok: false, error: `Erro da PushinPay: ${errorText}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: pushinpayResponse.status }
      );
    }

    const statusData = await pushinpayResponse.json();
    console.log("[pushinpay-get-status] Status obtido:", { id: order.pix_id, status: statusData.status });

    // Atualizar status no banco de dados
    if (statusData.status !== order.pix_status) {
      console.log("[pushinpay-get-status] Atualizando status no banco:", statusData.status);
      
      const updateData: any = {
        pix_status: statusData.status,
      };

      // Se foi pago, atualizar status do pedido
      if (statusData.status === "paid") {
        updateData.status = "paid";
        updateData.paid_at = new Date().toISOString();
      }

      const { error: updateError } = await supabaseClient
        .from("orders")
        .update(updateData)
        .eq("id", orderId);

      if (updateError) {
        console.error("[pushinpay-get-status] Erro ao atualizar pedido:", updateError);
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        status: {
          status: statusData.status,
          id: statusData.id,
          value: statusData.value,
          end_to_end_id: statusData.end_to_end_id,
          payer_name: statusData.payer_name,
          payer_national_registration: statusData.payer_national_registration,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[pushinpay-get-status] Erro inesperado:", error);
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
