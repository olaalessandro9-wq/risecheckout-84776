import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Gift, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchOrderBumpCandidates, OrderBumpCandidate } from "@/lib/orderBump/fetchCandidates";
import { fetchOffersByProduct, NormalizedOffer } from "@/services/offers";
import { formatBRL } from "@/lib/formatters/money";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  price: number;
  image_url?: string;
}

// Usamos o tipo do helper para a lista de produtos
export interface OrderBumpProduct extends OrderBumpCandidate {
  price: number; // Preço normalizado que vem da view
  image_url?: string;
}

interface Offer {
  id: string;
  name: string;
  price: number;
}

interface OrderBumpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  onSuccess: () => void;
}

export function OrderBumpDialog({ open, onOpenChange, productId, onSuccess }: OrderBumpDialogProps) {
  const [products, setProducts] = useState<OrderBumpProduct[]>([]);
  const [offers, setOffers] = useState<NormalizedOffer[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedOfferId, setSelectedOfferId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  
  // Customization fields
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discountPrice, setDiscountPrice] = useState("0,00");
  const [callToAction, setCallToAction] = useState("SIM, EU ACEITO ESSA OFERTA ESPECIAL!");
  const [customTitle, setCustomTitle] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [showImage, setShowImage] = useState(true);
  const [productInitialized, setProductInitialized] = useState<string | null>(null);

  const STORAGE_KEY = `orderBumpForm_${productId}`;

  // Load form data from localStorage when dialog opens
  useEffect(() => {
    if (open) {
      // Try to load saved form data
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          setSelectedProductId(parsed.selectedProductId || "");
          setSelectedOfferId(parsed.selectedOfferId || "");
          setDiscountEnabled(parsed.discountEnabled || false);
          setDiscountPrice(parsed.discountPrice || "0,00");
          setCallToAction(parsed.callToAction || "SIM, EU ACEITO ESSA OFERTA ESPECIAL!");
          setCustomTitle(parsed.customTitle || "");
          setCustomDescription(parsed.customDescription || "");
          setShowImage(parsed.showImage !== undefined ? parsed.showImage : true);
        } catch (e) {
          console.error("Error loading saved form data:", e);
        }
      }
    }
  }, [open, productId]);

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    if (open) {
      const formData = {
        selectedProductId,
        selectedOfferId,
        discountEnabled,
        discountPrice,
        callToAction,
        customTitle,
        customDescription,
        showImage,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
    }
  }, [open, selectedProductId, selectedOfferId, discountEnabled, discountPrice, callToAction, customTitle, customDescription, showImage, STORAGE_KEY]);

  useEffect(() => {
    if (selectedProductId) {
      loadOffers(selectedProductId);
    } else {
      setOffers([]);
      setSelectedOfferId("");
    }
  }, [selectedProductId]);

  // Update custom title and description when product changes (only on first selection)
  useEffect(() => {
    const selectedProduct = products.find(p => p.id === selectedProductId);
    if (selectedProduct && productInitialized !== selectedProductId) {
      // Set title and description only when product is selected for the first time
      setCustomTitle(selectedProduct.name);
      setCustomDescription(selectedProduct.description || "");
      setProductInitialized(selectedProductId);
    }
  }, [selectedProductId, products, productInitialized]);

  const resetForm = () => {
    setSelectedProductId("");
    setSelectedOfferId("");
    setDiscountEnabled(false);
    setDiscountPrice("0,00");
    setCallToAction("SIM, EU ACEITO ESSA OFERTA ESPECIAL!");
    setCustomTitle("");
    setCustomDescription("");
    setShowImage(true);
    setProductInitialized(null);
    
    // Clear localStorage
    localStorage.removeItem(STORAGE_KEY);
  };

  // Novo useEffect para carregar produtos usando o helper
  useEffect(() => {
    if (!open) return;
    
    let active = true;
    setLoadingProducts(true);
    
    fetchOrderBumpCandidates({ excludeProductId: productId })
      .then((rows) => {
        if (!active) return;
        
        // O helper agora retorna id, name, price, image_url e description
        setProducts(rows as OrderBumpProduct[]);
      })
      .catch((err) => {
        if (!active) return;
        toast.error("Erro ao carregar produtos");
        console.error("[OrderBump] load products failed:", err);
        setProducts([]);
      })
      .finally(() => {
        if (active) setLoadingProducts(false);
      });
      
    return () => {
      active = false;
    };
  }, [open, productId]);

  const loadOffers = async (prodId: string) => {
    try {
      const offersList = await fetchOffersByProduct(prodId);
      setOffers(offersList);
      
      // Automatically select the first offer (principal)
      if (offersList.length > 0) {
        setSelectedOfferId(offersList[0].id);
      }
    } catch (error: any) {
      console.error("Error loading offers:", error);
      toast.error(`Erro ao carregar ofertas: ${error?.message ?? 'erro desconhecido'}`);
    }
  };

  const formatCurrency = (value: string): string => {
    // Remove tudo exceto números
    const numbers = value.replace(/\D/g, '');
    
    if (!numbers) return '0,00';
    
    // Converte para número e divide por 100 para ter centavos
    const amount = parseInt(numbers) / 100;
    
    // Formata com separadores
    return amount.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleDiscountPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrency(e.target.value);
    setDiscountPrice(formatted);
  };

  const parseCurrency = (value: string): number => {
    // Converte "9,90" para 990 (centavos inteiros, igual ao resto do checkout)
    const decimal = parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;
    return Math.round(decimal * 100);
  };

  const handleSave = async () => {
    // Guardas: evita salvar com valores inválidos (causa comum de erro)
    const selectedProduct = products.find(p => p.id === selectedProductId);
    if (!selectedProduct?.id) {
      toast.error("Selecione um produto válido antes de salvar.");
      return;
    }

    if (!selectedOfferId) {
      toast.error("Selecione uma oferta");
      return;
    }

    // Validate discount price if discount is enabled
    if (discountEnabled) {
      const currentPrice = selectedOffer?.price || selectedProduct?.price || 0;
      const originPrice = parseCurrency(discountPrice);
      
      if (originPrice <= currentPrice) {
        toast.error("Valor deve ser maior que a oferta");
        return;
      }
    }

    try {
      setLoading(true);

      // Get the main checkout for the current product
      const { data: checkouts, error: checkoutsError } = await supabase
        .from("checkouts")
        .select("id")
        .eq("product_id", productId)
        .limit(1);

      if (checkoutsError) throw checkoutsError;

      if (!checkouts || checkouts.length === 0) {
        toast.error("Nenhum checkout encontrado para este produto");
        return;
      }

      // Add order bump only to the main checkout
      const orderBump = {
        checkout_id: checkouts[0].id,                // ✅ coluna de order_bumps
        product_id: selectedProductId,               // ✅ coluna de order_bumps
        offer_id: selectedOfferId,                   // ✅ coluna de order_bumps
        active: true,
        discount_enabled: !!discountEnabled,
        discount_price: discountEnabled ? parseCurrency(discountPrice) : null,
        call_to_action: callToAction?.trim() || null,
        custom_title: customTitle?.trim() || null,
        custom_description: customDescription?.trim() || null,
        show_image: !!showImage,
      };

      // Sanity-check: garante que não estamos mandando objeto "checkout"
      if ('checkout' in (orderBump as any)) {
        console.error('Payload inválido: não inclua objeto "checkout" no insert de order_bumps', orderBump);
        toast.error('Erro interno: payload inválido (checkout embutido).');
        return;
      }
      console.log('Salvando order_bumps com payload:', orderBump);

      const { error: insertError } = await supabase
        .from("order_bumps")
        .insert([orderBump]);

      if (insertError) throw insertError;

      toast.success("Order bump adicionado com sucesso");
      resetForm(); // Reset before closing
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Erro ao salvar order_bumps:", error);
      
      if (error.code === "23505") {
        toast.error("Este produto já está configurado como order bump");
      } else {
        toast.error(`Não foi possível salvar: ${error?.message ?? 'erro desconhecido'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    resetForm(); // Clear form and localStorage when closing
    onOpenChange(false);
  };

  const selectedProduct = products.find(p => p.id === selectedProductId);
  const selectedOffer = offers.find(o => o.id === selectedOfferId);
  
  // Calculate prices for preview
  const finalPrice = selectedOffer?.price || selectedProduct?.price || 0;
  const originalPrice = discountEnabled ? parseCurrency(discountPrice) : finalPrice;
  const discountPercentage = discountEnabled && originalPrice > finalPrice && originalPrice > 0
    ? Math.round(((originalPrice - finalPrice) / originalPrice) * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <div>
            <DialogTitle className="text-foreground text-lg flex items-center gap-2">
              <div className="w-7 h-7 bg-primary/20 rounded flex items-center justify-center">
                <Gift className="w-3.5 h-3.5 text-primary" />
              </div>
              Adicionar Order Bump
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Selecione um produto para oferecer como complemento
            </p>
          </div>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-4 py-3">
          {/* Formulário */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="produto" className="text-foreground">Produto *</Label>
              {loadingProducts ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <Select
                  value={selectedProductId}
                  onValueChange={setSelectedProductId}
                >
                  <SelectTrigger className="bg-background border-border text-foreground">
                    <SelectValue placeholder="Selecione um produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.length === 0 ? (
                      <div className="p-4 text-sm text-muted-foreground text-center">
                        Nenhum produto disponível
                      </div>
                    ) : (
                      products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
              <p className="text-[11px] text-muted-foreground leading-tight">
                Selecione o produto que será oferecido como order bump
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="oferta" className="text-foreground">Oferta *</Label>
              <Select
                value={selectedOfferId}
                onValueChange={setSelectedOfferId}
                disabled={!selectedProductId || offers.length === 0}
              >
                <SelectTrigger className="bg-background border-border text-foreground">
                  <SelectValue placeholder="Selecione uma oferta" />
                </SelectTrigger>
                <SelectContent>
                  {offers.map((offer) => (
                    <SelectItem key={offer.id} value={offer.id}>
                      {offer.product_name ?? selectedProduct?.name} - {formatBRL(offer.price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground leading-tight">
                A primeira oferta do produto é selecionada automaticamente
              </p>
            </div>

            {/* Checkbox Aplicar Desconto */}
            <div className="flex items-center space-x-2 pt-1">
              <Checkbox
                id="discount"
                checked={discountEnabled}
                onCheckedChange={(checked) => setDiscountEnabled(checked as boolean)}
              />
              <Label htmlFor="discount" className="text-foreground cursor-pointer">
                Aplicar desconto
              </Label>
            </div>

            {/* Campo Preço de Origem (condicional) */}
            {discountEnabled && (
              <div className="space-y-1.5">
                <Label htmlFor="discountPrice" className="text-foreground">Preço de origem</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    R$
                  </span>
                  <Input
                    id="discountPrice"
                    value={discountPrice}
                    onChange={handleDiscountPriceChange}
                    className={`pl-10 bg-background text-foreground ${
                      discountEnabled && parseCurrency(discountPrice) <= (selectedOffer?.price || selectedProduct?.price || 0)
                        ? "border-red-500"
                        : "border-border"
                    }`}
                    placeholder="0,00"
                  />
                </div>
                {discountEnabled && parseCurrency(discountPrice) <= (selectedOffer?.price || selectedProduct?.price || 0) ? (
                  <p className="text-xs text-red-500">
                    Valor deve ser maior que a oferta
                  </p>
                ) : (
                  <p className="text-xs text-primary">
                    {discountPercentage > 0 && `Desconto de aproximadamente ${discountPercentage}%`}
                  </p>
                )}
              </div>
            )}

            {/* Call to Action */}
            <div className="space-y-1.5">
              <Label htmlFor="callToAction" className="text-foreground">Call to Action</Label>
              <Input
                id="callToAction"
                value={callToAction}
                onChange={(e) => setCallToAction(e.target.value)}
                className="bg-background border-border text-foreground"
                placeholder="SIM, EU ACEITO ESSA OFERTA ESPECIAL!"
              />
              <p className="text-[11px] text-muted-foreground leading-tight">
                Texto que aparece no topo do order bump
              </p>
            </div>

            {/* Título */}
            <div className="space-y-1.5">
              <Label htmlFor="customTitle" className="text-foreground">Título</Label>
              <Input
                id="customTitle"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="bg-background border-border text-foreground"
                placeholder="Nome do seu produto"
              />
              <p className="text-[11px] text-muted-foreground leading-tight">
                Nome que aparece no order bump (padrão: nome do produto)
              </p>
            </div>

            {/* Descrição */}
            <div className="space-y-1.5">
              <Label htmlFor="customDescription" className="text-foreground">Descrição</Label>
              <Input
                id="customDescription"
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                className="bg-background border-border text-foreground"
                placeholder="Adicione a compra"
              />
              <p className="text-[11px] text-muted-foreground leading-tight">
                Texto descritivo do order bump
              </p>
            </div>

            {/* Checkbox Exibir Imagem */}
            <div className="flex items-center space-x-2 pt-1">
              <Checkbox
                id="showImage"
                checked={showImage}
                onCheckedChange={(checked) => setShowImage(checked as boolean)}
              />
              <Label htmlFor="showImage" className="text-foreground cursor-pointer">
                Exibir imagem do produto
              </Label>
            </div>


          </div>

          {/* Preview */}
          <div className="space-y-1.5">
            <Label className="text-foreground">Preview</Label>
            <div className="bg-background border border-border rounded-lg overflow-hidden">
              {selectedProduct ? (
                <>
                  {/* Cabeçalho - Call to Action */}
                  <div className="bg-muted/30 px-3 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <svg className="w-2.5 h-2.5 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-xs font-semibold text-primary uppercase">
                        {callToAction}
                      </span>
                    </div>
                    <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-muted-foreground" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  
                  {/* Conteúdo Principal */}
                  <div className="px-3 py-2.5 space-y-1.5">
                    <div className="flex gap-3">
                      {/* Imagem (condicional) */}
                      {showImage && selectedProduct.image_url && (
                        <div className="w-16 h-16 bg-muted rounded overflow-hidden flex-shrink-0">
                          <img 
                            src={selectedProduct.image_url} 
                            alt={customTitle || selectedProduct.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        {/* Título */}
                        <h3 className="text-sm font-semibold text-foreground leading-tight">
                          {customTitle}
                        </h3>
                        
                        {/* Descrição */}
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {customDescription}
                        </p>
                        
                        {/* Preço */}
                        <div className="flex items-center gap-2 mt-2">
                          {discountEnabled && discountPercentage > 0 ? (
                            <>
                              <span className="text-xs text-muted-foreground line-through">
                                R$ {(originalPrice / 100).toFixed(2).replace('.', ',')}
                              </span>
                              <span className="text-base font-bold text-primary">
                                R$ {(finalPrice / 100).toFixed(2).replace('.', ',')}
                              </span>
                            </>
                          ) : (
                            <span className="text-base font-bold text-primary">
                              R$ {(finalPrice / 100).toFixed(2).replace('.', ',')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Rodapé - Checkbox Adicionar */}
                  <div className="bg-muted/30 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-border rounded bg-background"></div>
                      <span className="text-xs text-foreground">
                        Adicionar Produto
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <Gift className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Selecione um produto para ver o preview
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-border">
          <Button 
            variant="ghost" 
            onClick={handleCancel}
            className="border border-border"
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSave}
            className="bg-primary hover:bg-primary/90"
            disabled={!selectedProductId || loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

