import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface EditPriceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  currentPrice: number; // em centavos
  onPriceUpdated: (newPrice: number) => void;
}

export function EditPriceDialog({
  open,
  onOpenChange,
  productId,
  currentPrice,
  onPriceUpdated,
}: EditPriceDialogProps) {
  const [price, setPrice] = useState(currentPrice);
  const [isSaving, setIsSaving] = useState(false);

  // Atualizar preço quando o dialog abrir
  useEffect(() => {
    if (open) {
      setPrice(currentPrice);
    }
  }, [open, currentPrice]);

  const handleSave = async () => {
    if (price <= 0) {
      toast.error("O preço deve ser maior que zero");
      return;
    }

    setIsSaving(true);

    try {
      console.log("[EditPriceDialog] Atualizando preço do produto:", productId, "para:", price);

      // 1. Atualizar preço do produto
      const { error: productError } = await supabase
        .from("products")
        .update({ price })
        .eq("id", productId);

      if (productError) {
        console.error("[EditPriceDialog] Erro ao atualizar produto:", productError);
        throw productError;
      }

      // 2. Atualizar preço da oferta padrão
      const { error: offerError } = await supabase
        .from("offers")
        .update({ price })
        .eq("product_id", productId)
        .eq("is_default", true);

      if (offerError) {
        console.error("[EditPriceDialog] Erro ao atualizar oferta:", offerError);
        throw offerError;
      }

      console.log("[EditPriceDialog] Preço atualizado com sucesso!");

      toast.success("Preço atualizado com sucesso!");
      onPriceUpdated(price);
      onOpenChange(false);
    } catch (error: any) {
      console.error("[EditPriceDialog] Erro:", error);
      toast.error(`Erro ao atualizar preço: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setPrice(currentPrice);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Preço</DialogTitle>
          <DialogDescription>
            Altere o preço do produto. Esta alteração será aplicada automaticamente
            em todos os links e checkouts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-price">Preço</Label>
            <CurrencyInput
              id="edit-price"
              value={price}
              onChange={setPrice}
              className="bg-background text-foreground border-border"
            />
            <p className="text-xs text-muted-foreground">
              O preço será atualizado no produto e na oferta padrão
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="bg-success hover:bg-success/90"
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
