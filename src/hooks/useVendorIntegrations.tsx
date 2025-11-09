import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface VendorIntegration {
  id: string;
  vendor_id: string;
  integration_type: string;
  config: {
    pixel_id?: string;
    access_token?: string;
    [key: string]: any;
  };
  active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Hook para carregar integrações de um vendedor específico
 * @param vendorId - ID do vendedor (usuário)
 * @param integrationType - Tipo de integração (opcional, filtra por tipo específico)
 */
export function useVendorIntegrations(vendorId?: string, integrationType?: string) {
  return useQuery({
    queryKey: ["vendor-integrations", vendorId, integrationType],
    queryFn: async () => {
      if (!vendorId) {
        return [];
      }

      let query = supabase
        .from("vendor_integrations")
        .select("*")
        .eq("vendor_id", vendorId);

      if (integrationType) {
        query = query.eq("integration_type", integrationType);
      }

      const { data, error } = await query;

      if (error) {
        console.error("[useVendorIntegrations] Error loading integrations:", error);
        throw error;
      }

      return (data || []) as VendorIntegration[];
    },
    enabled: !!vendorId,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

/**
 * Hook para carregar uma integração específica do Facebook Pixel
 * @param vendorId - ID do vendedor (usuário)
 */
export function useFacebookPixelIntegration(vendorId?: string) {
  const { data, isLoading, error } = useVendorIntegrations(vendorId, "FACEBOOK_PIXEL");
  
  const integration = data?.[0]; // Pega a primeira (e única) integração do tipo
  
  return {
    pixelId: integration?.config?.pixel_id,
    accessToken: integration?.config?.access_token,
    isActive: integration?.active || false,
    isLoading,
    error,
    integration,
  };
}
