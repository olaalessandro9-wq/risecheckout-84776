import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface WebhookFormProps {
  webhook?: {
    id: string;
    name: string;
    url: string;
    events: string[];
    product_id: string | null;
  };
  onSave: (data: {
    name: string;
    url: string;
    events: string[];
    product_id: string | null;
  }) => Promise<void>;
  onCancel: () => void;
}

const AVAILABLE_EVENTS = [
  { value: "purchase_approved", label: "Compra aprovada" },
  { value: "refund", label: "Reembolso" },
  { value: "chargeback", label: "Chargeback" },
];

interface Product {
  id: string;
  name: string;
}

export function WebhookForm({ webhook, onSave, onCancel }: WebhookFormProps) {
  const { user } = useAuth();
  const [name, setName] = useState(webhook?.name || "");
  const [url, setUrl] = useState(webhook?.url || "");
  const [productId, setProductId] = useState<string>(webhook?.product_id || "");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(
    webhook?.events || ["purchase_approved"]
  );
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isEditing = !!webhook;

  useEffect(() => {
    loadProducts();
  }, [user]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("id, name")
        .eq("user_id", user?.id)
        .eq("status", "active")
        .order("name");

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error loading products:", error);
      toast.error("Erro ao carregar produtos");
    } finally {
      setLoading(false);
    }
  };

  const handleEventChange = (event: string) => {
    setSelectedEvents((prev) => {
      if (prev.includes(event)) {
        return prev.filter((e) => e !== event);
      }
      return [...prev, event];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    if (!url.trim()) {
      toast.error("URL é obrigatória");
      return;
    }

    if (!productId) {
      toast.error("Selecione um produto");
      return;
    }

    if (selectedEvents.length === 0) {
      toast.error("Selecione pelo menos um evento");
      return;
    }

    // Validar URL
    try {
      new URL(url);
    } catch {
      toast.error("URL inválida");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        url: url.trim(),
        events: selectedEvents,
        product_id: productId,
      });
    } catch (error) {
      console.error("Erro ao salvar webhook:", error);
      toast.error("Erro ao salvar webhook");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="webhook-name" style={{ color: "var(--text)" }}>
          Nome <span className="text-red-500">*</span>
        </Label>
        <Input
          id="webhook-name"
          type="text"
          placeholder="Ex: N8N NOVO"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="webhook-url" style={{ color: "var(--text)" }}>
          URL <span className="text-red-500">*</span>
        </Label>
        <Input
          id="webhook-url"
          type="url"
          placeholder="http://72.60.249.53:5678/webhook/welcome"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="font-mono text-sm"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="webhook-product" style={{ color: "var(--text)" }}>
          Produto <span className="text-red-500">*</span>
        </Label>
        <Select value={productId} onValueChange={setProductId}>
          <SelectTrigger id="webhook-product">
            <SelectValue placeholder="Selecione um produto" />
          </SelectTrigger>
          <SelectContent>
            {products.map((product) => (
              <SelectItem key={product.id} value={product.id}>
                {product.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label style={{ color: "var(--text)" }}>
          Eventos <span className="text-red-500">*</span>
        </Label>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_EVENTS.map((event) => (
            <button
              key={event.value}
              type="button"
              onClick={() => handleEventChange(event.value)}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                selectedEvents.includes(event.value)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border hover:bg-accent"
              }`}
            >
              {event.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
