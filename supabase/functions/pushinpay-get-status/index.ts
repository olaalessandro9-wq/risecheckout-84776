import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  loadTokenEnvAndPixId,
  updateOrderStatusFromGateway,
} from "../_shared/db.ts";
import { handleOptions, withCorsError, withCorsJson } from "../_shared/cors.ts";

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
    const { orderId } = await req.json();

    if (!orderId) {
      return withCorsError(req, "orderId is required", 400);
    }

    console.log("[pushinpay-get-status] Checking status for orderId:", orderId);
    
    const { token, environment, pixId } = await loadTokenEnvAndPixId(orderId);
    
    console.log("[pushinpay-get-status] Loaded data:", { environment, pixId });
    
    const baseURL =
      environment === "sandbox"
        ? "https://api-sandbox.pushinpay.com.br/api"
        : "https://api.pushinpay.com.br/api";

    console.log("[pushinpay-get-status] Calling PushinPay API:", `${baseURL}/pix/consult/${pixId}`);
    
    const res = await fetch(`${baseURL}/pix/consult/${pixId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    console.log("[pushinpay-get-status] PushinPay response status:", res.status);

    if (!res.ok) {
      const errText = await res.text();
      console.error("[pushinpay-get-status] PushinPay error:", errText);
      return withCorsError(req, `PushinPay status error: ${errText}`, 502);
    }

    const status = await res.json();
    console.log("[pushinpay-get-status] PushinPay response data:", status);

    // Atualizar status no banco
    console.log("[pushinpay-get-status] Updating order status...");
    await updateOrderStatusFromGateway(orderId, status);
    console.log("[pushinpay-get-status] Order status updated successfully");

    // Criar resposta simples para evitar problemas de serialização
    const response = {
      ok: true,
      status: {
        status: status?.status || status?.data?.status || "created"
      }
    };
    
    console.log("[pushinpay-get-status] Returning response:", response);
    return withCorsJson(req, response);
  } catch (e) {
    console.error("[pushinpay-get-status] Error:", e);
    const errorMsg = e instanceof Error ? e.message : JSON.stringify(e);
    return withCorsError(req, `Status error: ${errorMsg}`, 500);
  }
});
