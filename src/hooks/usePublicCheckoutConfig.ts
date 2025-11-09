import { supabase } from "@/integrations/supabase/client";

export async function loadPublicCheckoutData(slug: string) {
  console.log('[loadPublicCheckoutData] v3.1 - Usando RPC para mapear slug:', slug);
  
  // Estratégia 1: Usar RPC para mapear slug → checkout_id (evita RLS problemático)
  const { data: mapData, error: mapError } = await supabase.rpc('get_checkout_by_payment_slug', { 
    p_slug: slug 
  });

  console.log('[loadPublicCheckoutData] RPC result:', { mapData, mapError });

  // Se RPC retornou checkout_id, buscar diretamente pelo ID
  if (!mapError && mapData && mapData.length > 0 && mapData[0]?.checkout_id) {
    const checkoutId = mapData[0].checkout_id;
    const productId = mapData[0].product_id;
    
    console.log('[loadPublicCheckoutData] RPC sucesso - checkout_id:', checkoutId, 'product_id:', productId);

    // Buscar checkout completo por ID (RLS permite leitura pública de checkouts ativos)
    const { data: checkoutData, error: checkoutError } = await supabase
      .from("checkouts")
      .select(`
        id,
        name,
        slug,
        visits_count,
        seller_name,
        product_id,
        font,
        background_color,
        text_color,
        primary_color,
        button_color,
        button_text_color,
        components,
        top_components,
        bottom_components,
        status,
        design,
        theme
      `)
      .eq("id", checkoutId)
      .maybeSingle();

    if (checkoutError || !checkoutData) {
      console.error('[loadPublicCheckoutData] Erro ao buscar checkout:', checkoutError);
      throw new Error("Checkout não encontrado");
    }

    // Validar status do checkout
    if (checkoutData.status === "deleted") {
      throw new Error("Checkout não disponível");
    }

    // Buscar produto por ID (RLS permite leitura pública de produtos ativos)
    const { data: productData, error: productError } = await supabase
      .from("products")
      .select(`
        id,
        name,
        description,
        price,
        image_url,
        support_name,
        required_fields,
        default_payment_method,
        status,
        user_id
      `)
      .eq("id", productId)
      .maybeSingle();

    if (productError || !productData) {
      console.error('[loadPublicCheckoutData] Erro ao buscar produto:', productError);
      throw new Error("Produto não encontrado");
    }

    // Validar status do produto
    if (productData.status === "deleted" || productData.status === "blocked") {
      throw new Error("Produto não disponível, inativo ou bloqueado. Contate o suporte para mais informações.");
    }

    // Extrair campos do produto
    const requiredFields = productData.required_fields as { phone?: boolean; cpf?: boolean } | null;
    const requirePhone = requiredFields?.phone ?? false;
    const requireCpf = requiredFields?.cpf ?? false;
    const defaultMethod = (productData.default_payment_method as 'pix' | 'credit_card') ?? 'pix';

    console.log('[loadPublicCheckoutData] ✅ Estratégia 1 (RPC) concluída com sucesso');

    return {
      checkout: {
        id: checkoutData.id,
        name: checkoutData.name,
        slug: checkoutData.slug,
        visits_count: checkoutData.visits_count,
        seller_name: checkoutData.seller_name,
        font: checkoutData.font,
        background_color: checkoutData.background_color,
        text_color: checkoutData.text_color,
        primary_color: checkoutData.primary_color,
        button_color: checkoutData.button_color,
        button_text_color: checkoutData.button_text_color,
        components: checkoutData.components,
        top_components: checkoutData.top_components,
        bottom_components: checkoutData.bottom_components,
        design: checkoutData.design,
        theme: checkoutData.theme,
      },
      product: {
        id: productData.id,
        name: productData.name,
        description: productData.description,
        price: productData.price,
        image_url: productData.image_url,
        support_name: productData.support_name,
        required_fields: productData.required_fields,
        default_payment_method: productData.default_payment_method,
      },
      vendorId: productData.user_id, // Adicionar vendor_id para carregar integrações
      requirePhone,
      requireCpf,
      defaultMethod,
    };
  }

  // Estratégia 2: Fallback para compatibilidade com slugs antigos (quando /pay/:slug era slug do checkout)
  console.warn('[loadPublicCheckoutData] RPC não retornou checkout_id, tentando buscar checkout por slug (fallback)...');
  
  const { data: fallbackCheckout, error: fallbackError } = await supabase
    .from("checkouts")
    .select(`
      id,
      name,
      slug,
      visits_count,
      seller_name,
      product_id,
      font,
      background_color,
      text_color,
      primary_color,
      button_color,
      button_text_color,
      components,
      top_components,
      bottom_components,
      status,
      design,
      theme
    `)
    .eq("slug", slug)
    .maybeSingle();

  if (fallbackError || !fallbackCheckout) {
    console.error('[loadPublicCheckoutData] Fallback falhou:', fallbackError);
    throw new Error("Checkout não encontrado");
  }

  // Validar status do checkout
  if (fallbackCheckout.status === "deleted") {
    throw new Error("Checkout não disponível");
  }

  // Buscar produto do checkout
  const { data: fallbackProduct, error: fallbackProductError } = await supabase
    .from("products")
    .select(`
      id,
      name,
      description,
      price,
      image_url,
      support_name,
      required_fields,
      default_payment_method,
      status,
      user_id
    `)
    .eq("id", fallbackCheckout.product_id)
    .maybeSingle();

  if (fallbackProductError || !fallbackProduct) {
    console.error('[loadPublicCheckoutData] Erro ao buscar produto (fallback):', fallbackProductError);
    throw new Error("Produto não encontrado");
  }

  // Validar status do produto
  if (fallbackProduct.status === "deleted" || fallbackProduct.status === "blocked") {
    throw new Error("Produto não disponível, inativo ou bloqueado. Contate o suporte para mais informações.");
  }

  // Extrair campos do produto
  const requiredFields = fallbackProduct.required_fields as { phone?: boolean; cpf?: boolean } | null;
  const requirePhone = requiredFields?.phone ?? false;
  const requireCpf = requiredFields?.cpf ?? false;
  const defaultMethod = (fallbackProduct.default_payment_method as 'pix' | 'credit_card') ?? 'pix';

  console.log('[loadPublicCheckoutData] ✅ Estratégia 2 (fallback) concluída com sucesso');

  return {
    checkout: {
      id: fallbackCheckout.id,
      name: fallbackCheckout.name,
      slug: fallbackCheckout.slug,
      visits_count: fallbackCheckout.visits_count,
      seller_name: fallbackCheckout.seller_name,
      font: fallbackCheckout.font,
      background_color: fallbackCheckout.background_color,
      text_color: fallbackCheckout.text_color,
      primary_color: fallbackCheckout.primary_color,
      button_color: fallbackCheckout.button_color,
      button_text_color: fallbackCheckout.button_text_color,
      components: fallbackCheckout.components,
      top_components: fallbackCheckout.top_components,
      bottom_components: fallbackCheckout.bottom_components,
      design: fallbackCheckout.design,
      theme: fallbackCheckout.theme,
    },
    product: {
      id: fallbackProduct.id,
      name: fallbackProduct.name,
      description: fallbackProduct.description,
      price: fallbackProduct.price,
      image_url: fallbackProduct.image_url,
      support_name: fallbackProduct.support_name,
      required_fields: fallbackProduct.required_fields,
      default_payment_method: fallbackProduct.default_payment_method,
    },
    vendorId: fallbackProduct.user_id, // Adicionar vendor_id para carregar integrações
    requirePhone,
    requireCpf,
    defaultMethod,
  };
}
