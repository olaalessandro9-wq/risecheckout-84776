import { supabase } from "@/integrations/supabase/client";

export type NormalizedOffer = {
  id: string;
  product_id: string;
  price: number;        // em centavos decimais (990.00 = R$ 9,90)
  product_name?: string | null;
  updated_at?: string | null;
};

export async function fetchOffersByProduct(productId: string): Promise<NormalizedOffer[]> {
  const { data, error } = await supabase
    .from("offers")
    .select("id, product_id, price, name, updated_at")
    .eq("product_id", productId)
    .order("updated_at", { ascending: false });
  
  if (error) {
    console.error("[Offers] load offers failed:", error);
    throw error;
  }
  
  return (data ?? []).map(offer => ({
    id: offer.id,
    product_id: offer.product_id,
    price: Number(offer.price), // Preço em centavos decimais (990.00 = R$ 9,90)
    product_name: offer.name,
    updated_at: offer.updated_at
  })) as NormalizedOffer[];
}
