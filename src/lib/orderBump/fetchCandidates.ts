// Helper para carregar candidatos de Order Bump direto do Supabase.
// Mantém a tipagem enxuta e independe de rotas /api inexistentes.
// Uso típico no modal: fetchOrderBumpCandidates().then(setProdutos)

import { supabase } from "@/integrations/supabase/client";

// Se o projeto já tiver um tipo Product/ProductLite em src/types/product,
// você pode trocar por esse import:
// import type { ProductLite } from "@/types/product";

export type OrderBumpCandidate = {
  id: string;
  name: string;
  price: number; // Preço em centavos (990 = R$ 9,90)
  status?: string | null;
  image_url?: string | null;
  description?: string | null;
};

/**
 * Busca produtos para serem candidatos de Order Bump.
 * @param excludeProductId opcionalmente exclui o produto atual da lista
 */
export async function fetchOrderBumpCandidates(opts?: {
  excludeProductId?: string;
}): Promise<OrderBumpCandidate[]> {
  const excludeId = opts?.excludeProductId;

  // Busca diretamente da tabela products (RLS já filtra por user_id)
  let query = supabase
    .from("products")
    .select("id,name,price,image_url,description")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  // Se quiser excluir o produto atual:
  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[OrderBump] load products failed:", error);
    throw error;
  }

  // Retorna produtos filtrados e validados, convertendo preço para centavos
  return (data ?? [])
    .filter((p: any) => p && p.id && p.name)
    .map((p: any) => ({
      ...p,
      price: Math.round(Number(p.price) * 100) // Converter decimal para centavos (990.00 → 99000)
    })) as unknown as OrderBumpCandidate[];
}
