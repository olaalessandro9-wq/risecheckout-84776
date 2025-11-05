import { useState } from "react";
import { attachOfferToCheckoutSmart } from "@/lib/links/attachOfferToCheckoutSmart";
import { useBusy } from "@/components/BusyProvider";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle } from "lucide-react";

type Offer = { 
  id: string; 
  name: string; 
  price: number; 
  is_default?: boolean;
};

interface CheckoutOfferSelectorProps {
  checkoutId: string;
  offers: Offer[];
  onLinked?: (result: { link_id: string; slug: string; mode: "reused" | "cloned" }) => void;
}

export function CheckoutOfferSelector({
  checkoutId,
  offers,
  onLinked,
}: CheckoutOfferSelectorProps) {
  const busy = useBusy();
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [processingOfferId, setProcessingOfferId] = useState<string | null>(null);

  async function handleAttach(offerId: string) {
    setProcessingOfferId(offerId);
    try {
      const result = await busy.run(
        () => attachOfferToCheckoutSmart(checkoutId, offerId),
        "Associando oferta ao checkout…"
      );

      setSelectedOfferId(offerId);
      onLinked?.({ 
        link_id: result.link_id, 
        slug: result.slug,
        mode: result.mode 
      });

      const offerName = offers.find(o => o.id === offerId)?.name ?? "oferta";
      
      toast.success(
        result.mode === "cloned"
          ? `Link novo criado para "${offerName}" (slug: ${result.slug})`
          : `Link da oferta associado (slug: ${result.slug})`
      );
    } catch (e: any) {
      console.error("[CheckoutOfferSelector] Erro ao associar oferta:", e);
      toast.error("Falha ao associar oferta ao checkout");
    } finally {
      setProcessingOfferId(null);
    }
  }

  if (offers.length === 0) {
    return (
      <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-yellow-500">
            Nenhuma oferta disponível
          </p>
          <p className="text-xs text-yellow-500/80 mt-1">
            Crie ofertas na aba "Geral" para poder associá-las a checkouts.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="text-foreground font-medium">
        Ofertas Disponíveis
      </Label>
      <p className="text-sm text-muted-foreground mb-3">
        Selecione uma oferta para associar a este checkout. O sistema irá reutilizar um link existente ou criar um novo automaticamente.
      </p>
      
      {offers.map((offer) => (
        <label 
          key={offer.id} 
          className={`flex items-center gap-3 rounded border p-3 cursor-pointer transition-colors ${
            selectedOfferId === offer.id 
              ? 'bg-primary/10 border-primary' 
              : 'hover:bg-muted/50'
          } ${processingOfferId === offer.id ? 'opacity-50 pointer-events-none' : ''}`}
        >
          <Checkbox
            checked={selectedOfferId === offer.id}
            onCheckedChange={() => handleAttach(offer.id)}
            disabled={processingOfferId !== null}
          />
          <div className="flex-1">
            <div className="font-medium text-foreground">{offer.name}</div>
            <div className="text-sm text-muted-foreground">
              R$ {offer.price.toFixed(2).replace(".", ",")}
              {offer.is_default ? " · Padrão" : ""}
            </div>
          </div>
        </label>
      ))}
    </div>
  );
}
