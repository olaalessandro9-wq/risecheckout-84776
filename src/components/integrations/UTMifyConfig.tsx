import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
}

interface UTMifyEvent {
  id: string;
  label: string;
  description: string;
}

const UTMIFY_EVENTS: UTMifyEvent[] = [
  { id: "pix_generated", label: "PIX Gerado", description: "Quando o QR Code do PIX é gerado" },
  { id: "purchase_approved", label: "Compra Aprovada", description: "Quando o pagamento é confirmado" },
  { id: "purchase_refused", label: "Compra Recusada", description: "Quando o pagamento é recusado (cartão)" },
  { id: "refund", label: "Reembolso", description: "Quando um pedido é reembolsado" },
  { id: "chargeback", label: "Chargeback", description: "Quando ocorre um chargeback" },
  { id: "checkout_abandoned", label: "Abandono de Checkout", description: "Quando o cliente abandona o checkout" },
];

export const UTMifyConfig = () => {
  const { user } = useAuth();
  
  const [utmifyToken, setUtmifyToken] = useState("");
  const [utmifyActive, setUtmifyActive] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  
  const [productsOpen, setProductsOpen] = useState(false);
  const [eventsOpen, setEventsOpen] = useState(false);

  // Carregar produtos do vendedor
  useEffect(() => {
    if (user) {
      loadProducts();
      loadUTMifyConfig();
    }
  }, [user]);

  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      const { data, error } = await supabase
        .from("products")
        .select("id, name")
        .eq("user_id", user?.id)
        .order("name");

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error loading products:", error);
      toast.error("Erro ao carregar produtos");
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadUTMifyConfig = async () => {
    try {
      setLoadingConfig(true);
      const { data, error } = await supabase
        .from("vendor_integrations")
        .select("*")
        .eq("vendor_id", user?.id)
        .eq("integration_type", "UTMIFY")
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setUtmifyToken(data.config?.api_token || "");
        setUtmifyActive(data.active || false);
        setSelectedProducts(data.config?.selected_products || []);
        setSelectedEvents(data.config?.selected_events || []);
      }
    } catch (error) {
      console.error("Error loading UTMify config:", error);
      toast.error("Erro ao carregar configuração da UTMify");
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      if (!utmifyToken.trim()) {
        toast.error("API Token é obrigatório");
        return;
      }

      // Verificar se já existe uma integração da UTMify para este usuário
      const { data: existingData, error: checkError } = await supabase
        .from("vendor_integrations")
        .select("id")
        .eq("vendor_id", user?.id)
        .eq("integration_type", "UTMIFY")
        .maybeSingle();

      if (checkError) throw checkError;

      const config = {
        api_token: utmifyToken.trim(),
        selected_products: selectedProducts,
        selected_events: selectedEvents,
      };

      if (existingData) {
        // Atualizar integração existente
        const { error: updateError } = await supabase
          .from("vendor_integrations")
          .update({
            config,
            active: utmifyActive,
            updated_at: new Date().toISOString()
          })
          .eq("id", existingData.id);

        if (updateError) throw updateError;
      } else {
        // Criar nova integração
        const { error: insertError } = await supabase
          .from("vendor_integrations")
          .insert({
            vendor_id: user?.id,
            integration_type: "UTMIFY",
            config,
            active: utmifyActive
          });

        if (insertError) throw insertError;
      }
      
      toast.success("Integração UTMify salva com sucesso!");
    } catch (error) {
      console.error("Error saving UTMify integration:", error);
      toast.error("Erro ao salvar integração UTMify");
    } finally {
      setSaving(false);
    }
  };

  const toggleProduct = (productId: string) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const toggleEvent = (eventId: string) => {
    setSelectedEvents(prev =>
      prev.includes(eventId)
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId]
    );
  };

  const getSelectedProductsLabel = () => {
    if (selectedProducts.length === 0) return "Selecione os produtos";
    if (selectedProducts.length === products.length) return "Todos os produtos";
    return `${selectedProducts.length} produto(s) selecionado(s)`;
  };

  const getSelectedEventsLabel = () => {
    if (selectedEvents.length === 0) return "Selecione os eventos";
    if (selectedEvents.length === UTMIFY_EVENTS.length) return "Todos os eventos";
    return `${selectedEvents.length} evento(s) selecionado(s)`;
  };

  if (loadingConfig || loadingProducts) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>UTMify</CardTitle>
          <CardDescription>Rastreamento de conversões com parâmetros UTM</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>UTMify</CardTitle>
        <CardDescription>Rastreamento de conversões com parâmetros UTM</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="utmify-token">API Token</Label>
          <Input
            id="utmify-token"
            type="text"
            placeholder="Cole seu token da API da UTMify"
            value={utmifyToken}
            onChange={(e) => setUtmifyToken(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Produtos</Label>
          <Popover open={productsOpen} onOpenChange={setProductsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="w-full justify-between"
              >
                {getSelectedProductsLabel()}
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar produto..." />
                <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                <CommandGroup className="max-h-64 overflow-auto">
                  {products.map((product) => (
                    <CommandItem
                      key={product.id}
                      onSelect={() => toggleProduct(product.id)}
                    >
                      <Checkbox
                        checked={selectedProducts.includes(product.id)}
                        className="mr-2"
                      />
                      {product.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
          {selectedProducts.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedProducts.map((productId) => {
                const product = products.find(p => p.id === productId);
                return product ? (
                  <Badge key={productId} variant="secondary">
                    {product.name}
                  </Badge>
                ) : null;
              })}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Eventos</Label>
          <Popover open={eventsOpen} onOpenChange={setEventsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="w-full justify-between"
              >
                {getSelectedEventsLabel()}
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar evento..." />
                <CommandEmpty>Nenhum evento encontrado.</CommandEmpty>
                <CommandGroup className="max-h-64 overflow-auto">
                  {UTMIFY_EVENTS.map((event) => (
                    <CommandItem
                      key={event.id}
                      onSelect={() => toggleEvent(event.id)}
                    >
                      <Checkbox
                        checked={selectedEvents.includes(event.id)}
                        className="mr-2"
                      />
                      <div>
                        <div className="font-medium">{event.label}</div>
                        <div className="text-xs text-muted-foreground">{event.description}</div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
          {selectedEvents.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedEvents.map((eventId) => {
                const event = UTMIFY_EVENTS.find(e => e.id === eventId);
                return event ? (
                  <Badge key={eventId} variant="secondary">
                    {event.label}
                  </Badge>
                ) : null;
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="utmify-active"
              checked={utmifyActive}
              onCheckedChange={setUtmifyActive}
            />
            <Label htmlFor="utmify-active">Ativo</Label>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
