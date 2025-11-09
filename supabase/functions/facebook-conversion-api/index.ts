import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConversionEvent {
  event_name: string; // 'Purchase', 'InitiateCheckout', 'ViewContent', etc.
  event_time: number; // Unix timestamp
  action_source: string; // 'website'
  event_source_url?: string;
  user_data: {
    em?: string; // Email (hashed with SHA256)
    ph?: string; // Phone (hashed with SHA256)
    fn?: string; // First name (hashed with SHA256)
    ln?: string; // Last name (hashed with SHA256)
    client_ip_address?: string;
    client_user_agent?: string;
    fbc?: string; // Facebook click ID
    fbp?: string; // Facebook browser ID
  };
  custom_data?: {
    value?: number;
    currency?: string;
    content_name?: string;
    content_ids?: string[];
    content_type?: string;
    num_items?: number;
  };
}

/**
 * Hash a string using SHA-256
 */
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}

/**
 * Send event to Facebook Conversions API
 */
async function sendToFacebook(
  pixelId: string,
  accessToken: string,
  events: ConversionEvent[]
): Promise<Response> {
  const url = `https://graph.facebook.com/v18.0/${pixelId}/events`;
  
  const body = {
    data: events,
    access_token: accessToken,
  };

  console.log("[Facebook Conversions API] Sending events:", JSON.stringify(body, null, 2));

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return response;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { vendor_id, event_name, event_data } = await req.json();

    console.log("[Facebook Conversions API] Request:", { vendor_id, event_name });

    if (!vendor_id || !event_name) {
      throw new Error("vendor_id and event_name are required");
    }

    // 1. Buscar integração do Facebook Pixel do vendedor
    const { data: integration, error: integrationError } = await supabaseClient
      .from("vendor_integrations")
      .select("config, active")
      .eq("vendor_id", vendor_id)
      .eq("integration_type", "FACEBOOK_PIXEL")
      .eq("active", true)
      .maybeSingle();

    if (integrationError) {
      console.error("[Facebook Conversions API] Error loading integration:", integrationError);
      throw integrationError;
    }

    if (!integration) {
      console.log("[Facebook Conversions API] No active Facebook Pixel integration found for vendor:", vendor_id);
      return new Response(
        JSON.stringify({ 
          ok: true, 
          message: "No active Facebook Pixel integration found" 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const pixelId = integration.config?.pixel_id;
    const accessToken = integration.config?.access_token;

    if (!pixelId || !accessToken) {
      console.log("[Facebook Conversions API] Pixel ID or Access Token not configured");
      return new Response(
        JSON.stringify({ 
          ok: true, 
          message: "Pixel ID or Access Token not configured" 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // 2. Preparar dados do evento
    const eventTime = Math.floor(Date.now() / 1000);
    
    // Hash user data
    const userData: any = {
      client_ip_address: event_data.client_ip_address,
      client_user_agent: event_data.client_user_agent,
    };

    if (event_data.email) {
      userData.em = await sha256(event_data.email);
    }

    if (event_data.phone) {
      userData.ph = await sha256(event_data.phone);
    }

    if (event_data.first_name) {
      userData.fn = await sha256(event_data.first_name);
    }

    if (event_data.last_name) {
      userData.ln = await sha256(event_data.last_name);
    }

    if (event_data.fbc) {
      userData.fbc = event_data.fbc;
    }

    if (event_data.fbp) {
      userData.fbp = event_data.fbp;
    }

    // 3. Criar evento
    const conversionEvent: ConversionEvent = {
      event_name,
      event_time: eventTime,
      action_source: "website",
      event_source_url: event_data.event_source_url,
      user_data: userData,
    };

    // Adicionar custom_data se fornecido
    if (event_data.custom_data) {
      conversionEvent.custom_data = event_data.custom_data;
    }

    // 4. Enviar para Facebook
    const fbResponse = await sendToFacebook(pixelId, accessToken, [conversionEvent]);
    const fbData = await fbResponse.json();

    console.log("[Facebook Conversions API] Facebook response:", fbData);

    if (!fbResponse.ok) {
      console.error("[Facebook Conversions API] Facebook API error:", fbData);
      throw new Error(`Facebook API error: ${JSON.stringify(fbData)}`);
    }

    return new Response(
      JSON.stringify({ 
        ok: true, 
        facebook_response: fbData 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("[Facebook Conversions API] Error:", error);
    return new Response(
      JSON.stringify({ 
        ok: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
