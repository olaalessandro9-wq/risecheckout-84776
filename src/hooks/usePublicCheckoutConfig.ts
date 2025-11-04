import { supabase } from "@/integrations/supabase/client";

export async function loadPublicCheckoutData(slug: string) {
  // Estratégia 1: Buscar pelo slug do payment_link (sem joins rígidos)
  const { data: linkData, error: linkError } = await supabase
    .from('payment_links')
    .select('id, slug, offer_id, status')
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle();

  if (linkError) {
    throw linkError;
  }

  // Se encontrou pelo payment_link, segue o fluxo
  if (linkData) {
    // Buscar o checkout associado (sem !inner)
    const { data: checkoutLinkData, error: checkoutLinkError } = await supabase
      .from('checkout_links')
      .select('checkout_id')
      .eq('link_id', linkData.id)
      .limit(1);

    if (checkoutLinkError) {
      throw checkoutLinkError;
    }

    if (!checkoutLinkData || checkoutLinkData.length === 0) {
      throw new Error('Checkout não encontrado para este link');
    }

    const checkoutId = checkoutLinkData[0].checkout_id;

    // Buscar dados do checkout
    const { data: checkoutData, error: checkoutError } = await supabase
      .from('checkouts')
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
        status
      `)
      .eq('id', checkoutId)
      .maybeSingle();

    if (checkoutError) {
      throw checkoutError;
    }

    if (!checkoutData) {
      throw new Error('Checkout não encontrado');
    }

    // Validar se checkout está deletado
    if (checkoutData.status === 'deleted') {
      throw new Error('Este checkout não está mais disponível');
    }

    // Buscar dados da oferta
    const { data: offerData, error: offerError } = await supabase
      .from('offers')
      .select('id, product_id')
      .eq('id', linkData.offer_id)
      .maybeSingle();

    if (offerError) {
      throw offerError;
    }

    if (!offerData) {
      throw new Error('Oferta não encontrada');
    }

    // Buscar dados do produto
    const { data: productData, error: productError } = await supabase
      .from('products')
      .select(`
        id,
        name,
        description,
        price,
        image_url,
        support_name
      `)
      .eq('id', offerData.product_id)
      .maybeSingle();

    if (productError) {
      throw productError;
    }

    if (!productData) {
      throw new Error('Produto não encontrado');
    }

    // Validar status do produto (se existir o campo)
    const productWithStatus = productData as typeof productData & { status?: string };
    if (productWithStatus.status === 'deleted' || productWithStatus.status === 'blocked') {
      throw new Error('Este produto não está mais disponível');
    }

    // TODO: Campo required_fields será implementado no futuro
    // Por enquanto, usar valores padrão
    const requirePhone = false;
    const requireCpf = false;
    const defaultMethod: 'pix' | 'credit_card' = 'pix';

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
      },
      product: {
        id: productData.id,
        name: productData.name,
        description: productData.description,
        price: productData.price,
        image_url: productData.image_url,
        support_name: productData.support_name,
      },
      requirePhone,
      requireCpf,
      defaultMethod,
    };
  }

  // Estratégia 2: Buscar pelo slug do checkout (fallback para compatibilidade)
  const { data: checkoutData, error: checkoutError } = await supabase
    .from('checkouts')
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
      status
    `)
    .eq('slug', slug)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (checkoutError) {
    throw checkoutError;
  }

  if (!checkoutData) {
    throw new Error('Link de pagamento não encontrado');
  }

  // Validar se checkout está deletado
  if (checkoutData.status === 'deleted') {
    throw new Error('Este checkout não está mais disponível');
  }

  // Buscar dados do produto
  const { data: productData, error: productError } = await supabase
    .from('products')
    .select(`
      id,
      name,
      description,
      price,
      image_url,
      support_name
    `)
    .eq('id', checkoutData.product_id)
    .maybeSingle();

  if (productError) {
    throw productError;
  }

  if (!productData) {
    throw new Error('Produto não encontrado');
  }

  // Validar status do produto (se existir o campo)
  const productWithStatus2 = productData as typeof productData & { status?: string };
  if (productWithStatus2.status === 'deleted' || productWithStatus2.status === 'blocked') {
    throw new Error('Este produto não está mais disponível');
  }

  // TODO: Campo required_fields será implementado no futuro
  // Por enquanto, usar valores padrão
  const requirePhone = false;
  const requireCpf = false;
  const defaultMethod: 'pix' | 'credit_card' = 'pix';

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
    },
    product: {
      id: productData.id,
      name: productData.name,
      description: productData.description,
      price: productData.price,
      image_url: productData.image_url,
      support_name: productData.support_name,
    },
    requirePhone,
    requireCpf,
    defaultMethod,
  };
}
