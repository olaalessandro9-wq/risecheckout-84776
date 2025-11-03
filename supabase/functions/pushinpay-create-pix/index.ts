import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.46.1";
import { decrypt } from "../_shared/crypto.ts";
import { handleOptions, withCorsError, withCorsJson } from "../_shared/cors.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const BASE_PROD = Deno.env.get("PUSHINPAY_BASE_URL_PROD") || "https://api.pushinpay.com.br/api";
const BASE_SANDBOX = Deno.env.get("PUSHINPAY_BASE_URL_SANDBOX") || "https://api-sandbox.pushinpay.com.br/api";
const PLATFORM_ACCOUNT = Deno.env.get("PLATFORM_PUSHINPAY_ACCOUNT_ID");

// Taxa da plataforma fixada no backend (controlada apenas pelo administrador)
const PLATFORM_FEE_PERCENT = parseFloat(Deno.env.get("PLATFORM_FEE_PERCENT") || "7.5");

serve(async (req) => {
  // 1) Tratar preflight OPTIONS
  if (req.method === "OPTIONS") {
    return handleOptions(req);
  }

  // 2) Validar método
  if (req.method !== "POST") {
    return withCorsError(req, "Method not allowed", 405);
  }

  try {
    const { orderId, valueInCents } = await req.json();

    // Validações de entrada
    if (!orderId) {
      return withCorsError(req, "orderId é obrigatório", 422);
    }

    if (typeof valueInCents !== "number" || valueInCents < 50) {
      return withCorsError(req, "Valor mínimo é R$ 0,50 (50 centavos)", 422);
    }

    // 1) Buscar o pedido e identificar o vendedor
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, vendor_id")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      console.error("[pushinpay-create-pix] Order not found:", { orderId, error: orderErr });
      return withCorsError(req, "Pedido não encontrado", 404);
    }

    console.log("[pushinpay-create-pix] Order found:", { orderId, vendorId: order.vendor_id });

    // 2) Buscar configurações do gateway do vendedor
    const { data: settings, error: settingsErr } = await supabase
      .from("payment_gateway_settings")
      .select("*")
      .eq("user_id", order.vendor_id)
      .single();

    if (settingsErr || !settings) {
      console.error("[pushinpay-create-pix] Gateway settings not found:", { 
        vendorId: order.vendor_id, 
        error: settingsErr 
      });
      return withCorsError(
        req,
        "Configuração de gateway não encontrada. Configure em Financeiro.",
        404
      );
    }

    // 3) Descriptografar token
    let token: string;
    try {
      token = await decrypt(settings.token_encrypted);
    } catch (e) {
      return withCorsError(req, "Erro ao processar credenciais de pagamento", 500);
    }

    // 4) Determinar URL base
    const environment = settings.environment as "sandbox" | "production";
    const baseURL = environment === "production" ? BASE_PROD : BASE_SANDBOX;

    console.log("[pushinpay-create-pix] Creating PIX charge:", { 
      orderId, 
      vendorId: order.vendor_id, 
      environment, 
      valueInCents 
    });

    // 5) Calcular split usando taxa fixa do backend
    const platformValue = Math.round(valueInCents * PLATFORM_FEE_PERCENT / 100);

    // Validar que split não excede 50%
    if (platformValue > valueInCents * 0.5) {
      return withCorsError(req, "Split não pode exceder 50% do valor da transação", 422);
    }

    // Montar split_rules apenas se houver taxa e PLATFORM_ACCOUNT configurado
    const split_rules = platformValue > 0 && PLATFORM_ACCOUNT
      ? [{ value: platformValue, account_id: PLATFORM_ACCOUNT }]
      : [];

    // 6) Construir webhook URL
    const webhookUrl = `${new URL(req.url).origin}/functions/v1/pushinpay-webhook`;

    // 7) Criar cobrança na PushinPay com expiração de 15 minutos
    const requestBody = {
      value: valueInCents, // API PushinPay espera "value" em centavos
      webhook_url: webhookUrl,
      expires_in: 900, // 15 minutos em segundos
      ...(split_rules.length > 0 && { split_rules }),
    };

    const response = await fetch(`${baseURL}/pix/cashIn`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    // Tratamento de erros da API
    if (!response.ok) {
      const errorText = await response.text();
      
      // Erros específicos
      if (response.status === 401) {
        return withCorsError(
          req,
          "Token PushinPay inválido. Verifique suas credenciais em Financeiro.",
          401
        );
      }

      if (response.status === 429) {
        return withCorsError(
          req,
          "Muitas tentativas. Aguarde alguns segundos e tente novamente.",
          429
        );
      }

      if (response.status >= 500) {
        return withCorsError(
          req,
          "Serviço de pagamento temporariamente indisponível. Tente novamente em instantes.",
          502
        );
      }

      return withCorsError(req, `Erro ao criar cobrança PIX: ${errorText}`, response.status);
    }

    const pixData = await response.json();

    // 🔍 LOG DE DIAGNÓSTICO
    console.log("[pushinpay-create-pix] PIX data from PushinPay:", {
      id: pixData.id,
      status: pixData.status,
      hasQrCode: !!pixData.qr_code,
      hasQrCodeBase64: !!pixData.qr_code_base64,
      qrCodeBase64Length: pixData.qr_code_base64?.length || 0,
      qrCodeBase64Preview: pixData.qr_code_base64?.substring(0, 50) || 'EMPTY'
    });

    // 8) Salvar mapeamento order_id -> pix_id
    const { error: mapErr } = await supabase
      .from("payments_map")
      .upsert({ order_id: orderId, pix_id: pixData.id });

    if (mapErr) {
      console.error("Erro ao salvar mapeamento:", mapErr);
      // Não falha a requisição, mas loga o erro
    }

    // 9) Retornar dados do PIX (envelope "pix" para compatibilidade com frontend)
    return withCorsJson(req, {
      ok: true,
      pix: {
        id: pixData.id,
        pix_id: pixData.id,
        qr_code: pixData.qr_code,
        qr_code_base64: pixData.qr_code_base64,
        status: pixData.status,
        value: valueInCents,
      }
    });

  } catch (error) {
    console.error("Erro inesperado:", error);
    return withCorsError(
      req,
      `Erro inesperado ao processar pagamento: ${String(error)}`,
      500
    );
  }
});
