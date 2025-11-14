import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://risecheckout.com",
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
      order_bump_ids = []
    } = await req.json();

    console.log("[create-order] Received request:", {
      vendor_id,
      product_id,
      customer_email,
      order_bump_ids
    });

    if (!vendor_id || !product_id || !customer_email || !customer_name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields", ok: false }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // 1. Buscar produto principal
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name, price, user_id")
      .eq("id", product_id)
      .eq("user_id", vendor_id)
      .single();

    if (productError || !product) {
      console.error("[create-order] Product not found:", productError);
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

    console.log("[create-order] Product found:", {
      id: product.id,
      name: product.name,
      price: product.price
    });

    // 2. Calcular preço do produto principal
    // ✅ CORRIGIDO: product.price já está em centavos, não precisa multiplicar
    const productPriceCents = Math.round(Number(product.price));
    let totalCents = productPriceCents;

    // 3. Buscar order bumps (se houver)
    let bumpsData: any[] = [];
    
    if (order_bump_ids && order_bump_ids.length > 0) {
      console.log("[create-order] Fetching order bumps:", order_bump_ids);
      
      // Buscar order bumps com produto relacionado
      const { data: bumps, error: bumpsError } = await supabase
        .from("order_bumps")
        .select(`
          id,
          custom_title,
          product_id,
          offer_id,
          discount_enabled,
          discount_price,
          products:product_id (
            id,
            name,
            price
          )
        `)
        .in("id", order_bump_ids)
        .eq("active", true);

      if (bumpsError) {
        console.error("[create-order] Error fetching bumps:", bumpsError);
      }

      if (bumps && bumps.length > 0) {
        console.log("[create-order] Bumps found:", bumps);
        
        bumpsData = bumps.map((bump: any) => {
          // Se tem desconto habilitado, usa discount_price
          // Senão, usa o preço do produto relacionado
          let bumpPrice = 0;
          
          if (bump.discount_enabled && bump.discount_price) {
            bumpPrice = Number(bump.discount_price);
          } else if (bump.products) {
            // Pode vir como array ou objeto
            const productData = Array.isArray(bump.products) ? bump.products[0] : bump.products;
            if (productData && productData.price) {
              bumpPrice = Number(productData.price);
            }
          }

          // ✅ CORRIGIDO: bumpPrice já está em centavos, não precisa multiplicar
          const bumpPriceCents = Math.round(bumpPrice);
          totalCents += bumpPriceCents;

          return {
            id: bump.id,
            title: bump.custom_title || (bump.products?.name || "Order Bump"),
            price_cents: bumpPriceCents,
            product_id: bump.product_id,
            offer_id: bump.offer_id
          };
        });
        
        console.log("[create-order] Bumps processed:", bumpsData);
      }
    }

    console.log("[create-order] Price calculation:", {
      product_price_reais: product.price,
      product_price_cents: productPriceCents,
      bumps_count: bumpsData.length,
      bumps_total_cents: totalCents - productPriceCents,
      total_cents: totalCents
    });

    // 4. Criar pedido
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        vendor_id,
        product_id,
        customer_email,
        customer_name,
        amount_cents: totalCents,
        currency: "BRL",
        payment_method: "pix",
        gateway: "pushinpay",
        status: "pending"
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error("[create-order] Failed to create order:", orderError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to create order", 
          details: orderError?.message,
          ok: false 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    console.log("[create-order] Order created:", {
      order_id: order.id,
      amount_cents: totalCents
    });

    // 5. Criar order_items (produto principal + bumps)
    const orderItems = [
      {
        order_id: order.id,
        product_id: product.id,
        product_name: product.name,
        amount_cents: productPriceCents,
        quantity: 1,  // ✅ ADICIONADO
        is_bump: false
      },
      ...bumpsData.map(bump => ({
        order_id: order.id,
        product_id: bump.product_id,
        product_name: bump.title,
        amount_cents: bump.price_cents,
        quantity: 1,  // ✅ ADICIONADO
        is_bump: true
        // ❌ REMOVIDO: order_bump_id (não existe na tabela)
        // ❌ REMOVIDO: offer_id (não existe na tabela)
      }))
    ];

    console.log("[create-order] Inserting order items:", orderItems);

    const { data: insertedItems, error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems)
      .select();

    if (itemsError) {
      console.error("[create-order] Error creating order items:", itemsError);
      // Não falha o pedido se order_items falhar, mas loga o erro
    } else {
      console.log("[create-order] Order items created:", insertedItems);
    }

    console.log("[create-order] Order created successfully:", {
      order_id: order.id,
      amount_cents: totalCents,
      items_count: orderItems.length
    });

    return new Response(
      JSON.stringify({
        ok: true,
        order_id: order.id,
        amount_cents: totalCents,
        message: "Order created successfully"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("[create-order] Error in function:", error);
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
