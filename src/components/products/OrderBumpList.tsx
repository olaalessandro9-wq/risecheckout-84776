import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, GripVertical, Gift, MoreVertical, Pencil } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OrderBump {
  id: string;
  checkout_id: string;
  product_id: string;
  offer_id: string | null;
  position: number;
  active: boolean;
  product_name: string;
  product_price: number;
  product_image?: string;
  offer_name?: string;
  offer_price?: number;
}

interface OrderBumpListProps {
  productId: string;
  onAdd: () => void;
  onEdit?: (orderBump: OrderBump) => void;
  maxOrderBumps?: number;
}

export function OrderBumpList({ productId, onAdd, onEdit, maxOrderBumps = 5 }: OrderBumpListProps) {
  const [orderBumps, setOrderBumps] = useState<OrderBump[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrderBumps();
  }, [productId]);

  const loadOrderBumps = async () => {
    try {
      setLoading(true);
      
      // Get all checkouts for this product
      const { data: checkouts, error: checkoutsError } = await supabase
        .from("checkouts")
        .select("id")
        .eq("product_id", productId);

      if (checkoutsError) throw checkoutsError;
      if (!checkouts || checkouts.length === 0) {
        setOrderBumps([]);
        return;
      }

      const checkoutIds = checkouts.map(c => c.id);

      // Get order bumps for these checkouts with product and offer details
      const { data, error } = await supabase
        .from("order_bumps")
        .select(`
          *,
          products!order_bumps_product_id_fkey (
            id,
            name,
            price,
            image_url
          ),
          offers (
            id,
            name,
            price
          )
        `)
        .in("checkout_id", checkoutIds)
        .order("position", { ascending: true });

      if (error) throw error;

      const mappedBumps: OrderBump[] = (data || []).map((bump: any) => ({
        id: bump.id,
        checkout_id: bump.checkout_id,
        product_id: bump.product_id,
        offer_id: bump.offer_id,
        position: bump.position,
        active: bump.active,
        product_name: bump.products?.name || "Produto não encontrado",
        product_price: bump.products?.price || 0,
        product_image: bump.products?.image_url,
        offer_name: bump.offers?.name,
        offer_price: bump.offers?.price,
      }));

      setOrderBumps(mappedBumps);
    } catch (error) {
      console.error("Error loading order bumps:", error);
      toast.error("Erro ao carregar order bumps");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      const { error } = await supabase
        .from("order_bumps")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Order bump removido com sucesso");
      loadOrderBumps();
    } catch (error) {
      console.error("Error removing order bump:", error);
      toast.error("Erro ao remover order bump");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orderBumps.length > 0 && (
        <div className="space-y-3">
          {orderBumps.map((orderBump, index) => (
            <div 
              key={orderBump.id} 
              className="bg-card border border-border rounded-lg p-4 flex items-start justify-between hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start gap-3 flex-1">
                <div className="flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                  <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
                    <span className="text-sm font-medium text-primary">{index + 1}</span>
                  </div>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-foreground mb-1">
                        {orderBump.product_name}
                      </h4>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>
                          Preço: R$ {orderBump.offer_price 
                            ? (orderBump.offer_price / 100).toFixed(2) 
                            : (orderBump.product_price / 100).toFixed(2)}
                        </span>
                        {orderBump.offer_name && (
                          <>
                            <span>•</span>
                            <span className="text-primary">Oferta: {orderBump.offer_name}</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:bg-accent"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {onEdit && (
                          <DropdownMenuItem
                            onClick={() => onEdit(orderBump)}
                            className="cursor-pointer"
                          >
                            <Pencil className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleRemove(orderBump.id)}
                          className="cursor-pointer text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Deletar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {orderBumps.length === 0 && (
        <div className="bg-muted rounded-lg p-8 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Gift className="w-8 h-8 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Nenhum order bump configurado ainda.
          </p>
          <p className="text-xs text-muted-foreground">
            Order bumps são produtos complementares oferecidos durante o checkout para aumentar o valor do pedido.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between pt-4">
        <Button 
          onClick={onAdd}
          disabled={orderBumps.length >= maxOrderBumps}
          className="bg-primary hover:bg-primary/90"
        >
          Adicionar Order Bump
        </Button>
        <span className="text-sm text-muted-foreground">
          {orderBumps.length}/{maxOrderBumps}
        </span>
      </div>
    </div>
  );
}

