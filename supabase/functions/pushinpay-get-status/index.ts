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
    
    console.log("[pushinpay-get-status] Config loaded:", { environment, pixId });
    
    const baseURL =
      environment === "sandbox"
        ? "https://api-sandbox.pushinpay.com.br/api"
        : "https://api.pushinpay.com.br/api";

    // 🔧 ENDPOINT CORRETO: GET /pix/{id} (não /pix/consult/{id})
    const endpoint = `${baseURL}/pix/${pixId}`;
    console.log("[pushinpay-get-status] Calling:", endpoint);
    
    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    console.log("[pushinpay-get-status] Response status:", res.status);

    if (!res.ok) {
      const errText = await res.text();
      console.error("[pushinpay-get-status] API error:", errText);
      return withCorsError(req, `Failed to get PIX status: ${errText}`, res.status);
    }

    const data = await res.json();
    console.log("[pushinpay-get-status] Response data:", { 
      id: data.id, 
      status: data.status,
      hasPixDetails: !!data.pix_details 
    });

    // Atualizar status no banco
    await updateOrderStatusFromGateway(orderId, data);

    // Resposta simplificada
    return withCorsJson(req, {
      ok: true,
      status: {
        status: data.status || "created"
      }
    });
  } catch (e) {
    console.error("[pushinpay-get-status] Error:", e);
    const errorMsg = e instanceof Error ? e.message : String(e);
    return withCorsError(req, `Error: ${errorMsg}`, 500);
  }
});
