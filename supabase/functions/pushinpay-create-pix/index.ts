import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { dispatchWebhook } from "../_shared/webhooks.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://risecheckout.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, valueInCents } = await req.json();
    
    console.log("[pushinpay-create-pix] Criando PIX:", {
      orderId,
      valueInCents
    });

    // Validações
    if (!orderId || !valueInCents) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "orderId e valueInCents são obrigatórios"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400
        }
      );
    }

    if (valueInCents < 50) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Valor mínimo é 50 centavos"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400
        }
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
        JSON.stringify({
          ok: false,
          error: "Pedido não encontrado"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404
        }
      );
    }

    // Buscar token da PushinPay do vendor
    const { data: vendorData, error: vendorError } = await supabaseClient
      .from("payment_gateway_settings")
      .select("pushinpay_token, environment")
      .eq("user_id", order.vendor_id)
      .single();

    if (vendorError || !vendorData?.pushinpay_token) {
      console.error("[pushinpay-create-pix] Erro ao buscar configurações:", vendorError);
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Configurações da PushinPay não encontradas"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400
        }
      );
    }

    // ✅ NOVO: Buscar configurações da plataforma (account_id e split percentage)
    const { data: platformSettings, error: platformError } = await supabaseClient
      .from("platform_settings")
      .select("key, value")
      .in("key", [
        "pushinpay_platform_account_id",
        "platform_split_percentage"
      ]);
    
    if (platformError) {
      console.error("[pushinpay-create-pix] Erro ao buscar configurações da plataforma:", platformError);
    }

    // Converter array para objeto
    const platformConfig: Record<string, string> = {};
    if (platformSettings) {
      platformSettings.forEach((setting: any) => {
        platformConfig[setting.key] = setting.value;
      });
    }

    const platformAccountId = platformConfig["pushinpay_platform_account_id"];
    const splitPercentage = parseFloat(platformConfig["platform_split_percentage"] || "0");

    console.log("[pushinpay-create-pix] Configurações de split:", {
      hasPlatformAccountId: !!platformAccountId,
      splitPercentage: splitPercentage
    });

    // Determinar URL da API baseado no ambiente
    const environment = vendorData.environment || "production";
    const apiUrl =
      environment === "sandbox"
        ? "https://api-sandbox.pushinpay.com.br/api"
        : "https://api.pushinpay.com.br/api";

    console.log("[pushinpay-create-pix] Usando ambiente:", environment, "URL:", apiUrl);
    console.log(
      "[pushinpay-create-pix] Token (primeiros 10 chars):",
      vendorData.pushinpay_token.substring(0, 10)
    );

    // ✅ CORRIGIDO: Construir split_rules conforme documentação oficial da PushinPay
    const split_rules: any[] = [];
    
    if (platformAccountId && splitPercentage > 0) {
      // Calcular valor do split em centavos
      const splitValueInCents = Math.floor(valueInCents * (splitPercentage / 100));
      
      split_rules.push({
        value: splitValueInCents,
        account_id: platformAccountId
      });
      
      console.log("[pushinpay-create-pix] Split configurado:", {
        percentage: splitPercentage,
        splitValueInCents: splitValueInCents,
        platformAccountId: platformAccountId
      });
    } else {
      console.log("[pushinpay-create-pix] ⚠️ ERRO: Split não configurado (obrigatório!)");
      
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Split não configurado. Entre em contato com o suporte."
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500
        }
      );
    }

    // Criar PIX na PushinPay
    let pushinpayResponse = await fetch(`${apiUrl}/pix/cashIn`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${vendorData.pushinpay_token}`,
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        value: valueInCents,
        webhook_url: null,
        split_rules: split_rules  // ✅ ATUALIZADO: Agora envia split_rules
      })
    });

    // ❌ FALLBACK REMOVIDO: Split é obrigatório para o modelo de negócio

    if (!pushinpayResponse.ok) {
      const errorText = await pushinpayResponse.text();
      console.error("[pushinpay-create-pix] Erro da PushinPay - Status:", pushinpayResponse.status);
      console.error("[pushinpay-create-pix] Erro da PushinPay - Resposta:", errorText);
      console.error("[pushinpay-create-pix] Headers enviados:", {
        Authorization: `Bearer ${vendorData.pushinpay_token?.substring(0, 10)}...`,
        Accept: "application/json",
        "Content-Type": "application/json"
      });
      console.error("[pushinpay-create-pix] Body enviado:", JSON.stringify({
        value: valueInCents,
        webhook_url: null,
        split_rules: split_rules
      }));

      return new Response(
        JSON.stringify({
          ok: false,
          error: `Erro da PushinPay: ${errorText}`
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: pushinpayResponse.status
        }
      );
    }

    const pixData = await pushinpayResponse.json();

    console.log("[pushinpay-create-pix] PIX criado com sucesso:", {
      id: pixData.id,
      status: pixData.status,
      split_applied: split_rules.length > 0
    });

    // Salvar dados do PIX no pedido
    const { error: updateError } = await supabaseClient
      .from("orders")
      .update({
        pix_id: pixData.id,
        pix_qr_code: pixData.qr_code,
        pix_status: pixData.status,
        pix_created_at: new Date().toISOString()
      })
      .eq("id", orderId);

    if (updateError) {
      console.error("[pushinpay-create-pix] Erro ao atualizar pedido:", updateError);
    }

    // Enviar email com QR Code do PIX (não bloqueia a resposta)
    fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-pix-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
      },
      body: JSON.stringify({
        order_id: orderId
      })
    }).catch((err) =>
      console.error("[pushinpay-create-pix] Erro ao enviar email:", err)
    );

    // ✅ NOVO: Disparar webhook pix_generated (não bloqueia a resposta)
    dispatchWebhook(orderId, "pix_generated", {
      event: "pix_generated",
      order_id: orderId,
      pix: {
        id: pixData.id,
        qr_code: pixData.qr_code,
        status: pixData.status,
        value_cents: valueInCents
      },
      timestamp: new Date().toISOString()
    }).catch((err) =>
      console.error("[pushinpay-create-pix] Erro ao disparar webhook:", err)
    );

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
          qr_code_base64: pixData.qr_code_base64
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("[pushinpay-create-pix] Erro inesperado:", error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: (error as Error).message
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500
      }
    );
  }
});
