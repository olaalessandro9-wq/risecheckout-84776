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
    console.log(`[deleteProductCascade] Product ${productId} has ${count} order(s). Performing SOFT DELETE.`);
    
    const { error } = await supabase
      .from('products')
      .update({ status: 'deleted' })
      .eq('id', productId);
    
    if (error) {
      console.error('[deleteProductCascade] Soft delete failed:', error);
      throw new Error(`Falha ao desativar produto: ${error.message}`);
    }
    
    console.log('[deleteProductCascade] ✅ Soft delete successful. Product hidden from UI but preserved for order history.');
    
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
