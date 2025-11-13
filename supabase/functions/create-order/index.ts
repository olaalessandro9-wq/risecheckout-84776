import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

    // Validar inputs obrigatórios
    if (!vendor_id || !product_id || !customer_email || !customer_name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields", ok: false }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ✅ SEGURANÇA: Buscar preço REAL do produto no banco
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, price, user_id')
      .eq('id', product_id)
      .eq('user_id', vendor_id) // Garantir que o produto pertence ao vendor
      .single();

    if (productError || !product) {
      return new Response(
        JSON.stringify({ 
          error: "Product not found or doesn't belong to vendor", 
          ok: false 
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ✅ SEGURANÇA: Buscar preços REAIS dos order bumps no banco
    let bumpsTotal = 0;
    const bumpsData = [];

    if (order_bump_ids && order_bump_ids.length > 0) {
      const { data: bumps, error: bumpsError } = await supabase
        .from('order_bumps')
        .select('id, title, price, product_id, offer_id')
        .in('id', order_bump_ids)
        .eq('product_id', product_id); // Garantir que os bumps pertencem ao produto

      if (!bumpsError && bumps) {
        bumpsTotal = bumps.reduce((sum, bump) => sum + Number(bump.price), 0);
        bumpsData.push(...bumps);
      }
    }

    // ✅ SEGURANÇA: Calcular total NO SERVIDOR
    const amount_cents = Number(product.price) + bumpsTotal;

    console.log("Creating order with validated prices:", {
      product_price: product.price,
      bumps_total: bumpsTotal,
      total: amount_cents
    });

    // Criar pedido com preço validado
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        vendor_id,
        product_id,
        customer_email,
        customer_name,
        amount_cents, // ✅ Preço calculado no servidor
        currency: currency || "BRL",
        payment_method: payment_method || "pix",
        gateway: gateway || "pushinpay",
        status: status || "pending"
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error("Error creating order:", orderError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to create order: " + orderError?.message, 
          ok: false 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Criar order_items (produto principal + order bumps)
    const orderItems = [
      // Produto principal
      {
        order_id: order.id,
        product_id: product.id,
        product_name: product.name,
        amount_cents: product.price,
        is_bump: false
      },
      // Order bumps
      ...bumpsData.map(bump => ({
        order_id: order.id,
        product_id: bump.product_id,
        product_name: bump.title,
        amount_cents: bump.price,
        is_bump: true,
        order_bump_id: bump.id,
        offer_id: bump.offer_id
      }))
    ];

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error("Error creating order items:", itemsError);
      // Não falhar a requisição, apenas logar o erro
    }

    console.log("Order created successfully:", {
      order_id: order.id,
      amount_cents,
      items_count: orderItems.length
    });

    // ✅ Retornar order_id E amount_cents calculado
    return new Response(
      JSON.stringify({
        ok: true,
        order_id: order.id,
        amount_cents, // ✅ Preço validado retornado para o frontend
        message: "Order created successfully"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in create-order function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message, 
        ok: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
