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
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

interface SortableOrderBumpItemProps {
  orderBump: OrderBump;
  index: number;
  onEdit?: (orderBump: OrderBump) => void;
  onRemove: (id: string) => void;
}

function SortableOrderBumpItem({ orderBump, index, onEdit, onRemove }: SortableOrderBumpItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: orderBump.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-card border border-border rounded-lg p-4 flex items-start justify-between hover:border-primary/50 transition-colors ${
        isDragging ? 'z-50 shadow-lg ring-2 ring-primary/20' : ''
      }`}
    >
      <div className="flex items-start gap-3 flex-1">
        <div className="flex items-center gap-2">
          <div 
            {...attributes} 
            {...listeners} 
            className="cursor-grab active:cursor-grabbing touch-none"
          >
            <GripVertical className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />
          </div>
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
                    ? Number(orderBump.offer_price).toFixed(2) 
                    : Number(orderBump.product_price).toFixed(2)}
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
                  onClick={() => onRemove(orderBump.id)}
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
  );
}

export function OrderBumpList({ productId, onAdd, onEdit, maxOrderBumps = 5 }: OrderBumpListProps) {
  const [orderBumps, setOrderBumps] = useState<OrderBump[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Evita cliques acidentais
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;
    
    const oldIndex = orderBumps.findIndex((b) => b.id === active.id);
    const newIndex = orderBumps.findIndex((b) => b.id === over.id);
    
    // 1. Atualizar estado local imediatamente (UI responsiva)
    const newOrder = arrayMove(orderBumps, oldIndex, newIndex);
    setOrderBumps(newOrder);
    
    // 2. Salvar automaticamente no banco de dados
    setIsSaving(true);
    try {
      // Atualizar a posição de todos os order bumps
      const updates = newOrder.map((bump, index) => 
        supabase
          .from('order_bumps')
          .update({ position: index })
          .eq('id', bump.id)
      );
      
      await Promise.all(updates);
      
      toast.success('Ordem atualizada com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar ordem:', error);
      toast.error('Erro ao salvar nova ordem');
      // Reverter estado local em caso de erro
      loadOrderBumps();
    } finally {
      setIsSaving(false);
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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={orderBumps.map(b => b.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {orderBumps.map((orderBump, index) => (
                <SortableOrderBumpItem
                  key={orderBump.id}
                  orderBump={orderBump}
                  index={index}
                  onEdit={onEdit}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
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
          disabled={orderBumps.length >= maxOrderBumps || isSaving}
          className="bg-primary hover:bg-primary/90"
        >
          {isSaving ? "Salvando..." : "Adicionar Order Bump"}
        </Button>
        <span className="text-sm text-muted-foreground">
          {orderBumps.length}/{maxOrderBumps}
        </span>
      </div>
    </div>
  );
}
