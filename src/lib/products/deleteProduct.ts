import { removeAllUnderPrefix } from "@/lib/supabase/storageHelpers";

/**
 * Smart Delete: Soft delete se houver pedidos vinculados, hard delete caso contrário
 * 
 * @param supabase - Cliente Supabase
 * @param rawProductId - ID do produto (string ou number)
 * @throws Error se o produto não puder ser excluído
 */
export async function deleteProductCascade(supabase: any, rawProductId: string | number): Promise<void> {
  // Garantir que productId é uma string UUID válida
  const productId = String(rawProductId).trim();
  
  if (!productId || productId === 'undefined' || productId === 'null') {
    console.error('[deleteProductCascade] Invalid product ID:', rawProductId);
    throw new Error("ID do produto inválido");
  }

  console.log('[deleteProductCascade] Starting smart deletion for product:', productId);

  // 1) Verificar se há pedidos vinculados ao produto
  const { count, error: countError } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('product_id', productId);

  if (countError) {
    console.error('[deleteProductCascade] Error checking orders:', countError);
    throw new Error(`Erro ao verificar pedidos: ${countError.message}`);
  }

  // 2) Decidir estratégia: soft delete ou hard delete
  if (count && count > 0) {
    // SOFT DELETE: Produto tem pedidos vinculados
    console.log(`[deleteProductCascade] Product ${productId} has ${count} order(s). Performing SOFT DELETE with cleanup.`);
    
    // 2.1. Soft delete do produto
    const { error: productError } = await supabase
      .from('products')
      .update({ status: 'deleted', active: false })
      .eq('id', productId);
    
    if (productError) {
      console.error('[deleteProductCascade] Product soft delete failed:', productError);
      throw new Error(`Falha ao desativar produto: ${productError.message}`);
    }

    // 2.2. Soft delete de TODOS os checkouts do produto (preserva visitas)
    const { error: checkoutsError } = await supabase
      .from('checkouts')
      .update({ status: 'deleted' })
      .eq('product_id', productId);
    
    if (checkoutsError) {
      console.error('[deleteProductCascade] Checkouts soft delete failed:', checkoutsError);
      throw new Error(`Erro ao desativar checkouts: ${checkoutsError.message}`);
    }
    console.log('[deleteProductCascade] ✅ Checkouts marked as deleted (visits preserved)');

    // 2.3. Buscar todas as offers do produto
    const { data: offers, error: offersError } = await supabase
      .from('offers')
      .select('id')
      .eq('product_id', productId);

    if (offersError) {
      console.error('[deleteProductCascade] Error fetching offers:', offersError);
      throw new Error(`Erro ao buscar ofertas: ${offersError.message}`);
    }

    // 2.4. Desativar payment_links (não deletar, apenas marcar como inactive)
    if (offers && offers.length > 0) {
      const offerIds = offers.map(o => o.id);
      
      const { error: linksError } = await supabase
        .from('payment_links')
        .update({ status: 'inactive' })
        .in('offer_id', offerIds);
      
      if (linksError) {
        console.error('[deleteProductCascade] Payment links deactivation failed:', linksError);
        throw new Error(`Erro ao desativar payment links: ${linksError.message}`);
      }
      console.log(`[deleteProductCascade] ✅ Deactivated ${offers.length} payment link(s)`);
    }

    console.log('[deleteProductCascade] ✅ Soft delete successful. Product, checkouts, and links deactivated. Orders and visits preserved.');
    
  } else {
    // HARD DELETE: Produto NÃO tem pedidos vinculados
    console.log(`[deleteProductCascade] Product ${productId} has no orders. Performing HARD DELETE.`);
    
    // Limpa imagens do produto antes de deletar
    try {
      await removeAllUnderPrefix(supabase, "product-images", `checkouts/${productId}`);
      console.log('[deleteProductCascade] Product images removed successfully');
    } catch (storageError: any) {
      console.warn('[deleteProductCascade] Failed to remove images (non-blocking):', storageError);
      // Continua mesmo se houver erro ao remover imagens
    }
    
    // Deleta produto; FKs com ON DELETE CASCADE limpam checkouts/links/offers automaticamente
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);
    
    if (error) {
      console.error('[deleteProductCascade] Hard delete failed:', error);
      throw new Error(`Falha ao excluir produto: ${error.message}`);
    }
    
    console.log('[deleteProductCascade] ✅ Hard delete successful. Product and related data permanently removed.');
  }
}
