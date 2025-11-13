import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const {
      vendor_id,
      product_id,
      customer_email,
      customer_name,
      currency,
      payment_method,
      gateway,
      status,
      order_bump_ids = []
    } = await req.json();

    if (!vendor_id || !product_id || !customer_email || !customer_name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields", ok: false }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name, price, user_id")
      .eq("id", product_id)
      .eq("user_id", vendor_id)
      .single();

    if (productError || !product) {
      return new Response(
        JSON.stringify({ 
          error: "Product not found", 
          ok: false 
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const productPriceCents = Math.round(Number(product.price) * 100);
    const amount_cents = productPriceCents;

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        vendor_id,
        product_id,
        customer_email,
        customer_name,
        amount_cents,
        currency: currency || "BRL",
        payment_method: payment_method || "pix",
        gateway: gateway || "pushinpay",
        status: status || "pending"
      })
      .select()
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ 
          error: "Failed to create order", 
          ok: false 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        order_id: order.id,
        amount_cents,
        message: "Order created successfully"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: (error as Error)?.message || "Unknown error", 
        ok: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
