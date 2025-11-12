import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { WebhooksList } from "./WebhooksList";
import { WebhookForm } from "./WebhookForm";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface WebhookData {
  id: string;
  name: string;
  url: string;
  events: string[];
  product_id: string | null;
  created_at: string;
  product?: {
    name: string;
  };
}

interface Product {
  id: string;
  name: string;
}

export function WebhooksConfig() {
  const { user } = useAuth();
  const [webhooks, setWebhooks] = useState<WebhookData[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookData | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<string>("all");

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Carregar produtos
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("id, name")
        .eq("user_id", user?.id)
        .eq("status", "active")
        .order("name");

      if (productsError) throw productsError;
      setProducts(productsData || []);

      // Carregar webhooks
      const { data: webhooksData, error: webhooksError } = await supabase
        .from("outbound_webhooks")
        .select("*")
        .eq("vendor_id", user?.id)
        .order("created_at", { ascending: false });

      if (webhooksError) throw webhooksError;
      
      // Mapear para incluir nomes de produtos
      const webhooksWithProducts = await Promise.all(
        (webhooksData || []).map(async (webhook: any) => {
          if (webhook.product_id) {
            const { data: product } = await supabase
              .from("products")
              .select("name")
              .eq("id", webhook.product_id)
              .single();
            return { ...webhook, product } as WebhookData;
          }
          return webhook as WebhookData;
        })
      );
      
      setWebhooks(webhooksWithProducts);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data: {
    name: string;
    url: string;
    events: string[];
    product_ids: string[];
  }) => {
    try {
      // Gerar secret automaticamente (não será exibido ao usuário)
      const secret = `whsec_${crypto.randomUUID().replace(/-/g, "")}`;

      if (editingWebhook) {
        // Atualizar webhook existente
        const { error: updateError } = await supabase
          .from("outbound_webhooks")
          .update({
            name: data.name,
            url: data.url,
            events: data.events,
            product_id: data.product_ids[0] || null, // Manter compatibilidade
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingWebhook.id);

        if (updateError) throw updateError;

        // Atualizar produtos na tabela webhook_products
        // 1. Remover produtos antigos
        const { error: deleteError } = await supabase
          .from("webhook_products")
          .delete()
          .eq("webhook_id", editingWebhook.id);

        if (deleteError) throw deleteError;

        // 2. Inserir novos produtos
        if (data.product_ids.length > 0) {
          const { error: insertError } = await supabase
            .from("webhook_products")
            .insert(
              data.product_ids.map((productId) => ({
                webhook_id: editingWebhook.id,
                product_id: productId,
              }))
            );

          if (insertError) throw insertError;
        }

        toast.success("Webhook atualizado com sucesso!");
      } else {
        // Criar novo webhook
        const { data: newWebhook, error: webhookError } = await supabase
          .from("outbound_webhooks")
          .insert({
            vendor_id: user?.id,
            name: data.name,
            url: data.url,
            events: data.events,
            product_id: data.product_ids[0] || null, // Manter compatibilidade
            secret: secret,
            active: true,
          })
          .select()
          .single();

        if (webhookError) throw webhookError;

        // Inserir produtos na tabela webhook_products
        if (data.product_ids.length > 0 && newWebhook) {
          const { error: insertError } = await supabase
            .from("webhook_products")
            .insert(
              data.product_ids.map((productId) => ({
                webhook_id: newWebhook.id,
                product_id: productId,
              }))
            );

          if (insertError) throw insertError;
        }

        toast.success("Webhook criado com sucesso!");
      }

      setSheetOpen(false);
      setEditingWebhook(null);
      loadData();
    } catch (error) {
      console.error("Error saving webhook:", error);
      throw error;
    }
  };

  const handleEdit = (webhook: WebhookData) => {
    setEditingWebhook(webhook);
    setSheetOpen(true);
  };

  const handleDelete = async (webhookId: string) => {
    try {
      const { error } = await supabase
        .from("outbound_webhooks")
        .delete()
        .eq("id", webhookId);

      if (error) throw error;

      toast.success("Webhook excluído com sucesso!");
      loadData();
    } catch (error) {
      console.error("Error deleting webhook:", error);
      toast.error("Erro ao excluir webhook");
      throw error;
    }
  };

  const handleCancel = () => {
    setSheetOpen(false);
    setEditingWebhook(null);
  };

  const handleNewWebhook = () => {
    setEditingWebhook(null);
    setSheetOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header com busca e filtros */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por produto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os produtos</SelectItem>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleNewWebhook}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar
          </Button>
        </div>

        {/* Lista de webhooks */}
        <WebhooksList
          webhooks={webhooks}
          onEdit={handleEdit}
          onDelete={handleDelete}
          selectedProduct={selectedProduct}
        />
      </div>

      {/* Sheet lateral para criar/editar */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-[500px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingWebhook ? "Editar Webhook" : "Novo Webhook"}
            </SheetTitle>
            <SheetDescription>
              Configure as integrações com os seus apps
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <WebhookForm
              webhook={editingWebhook || undefined}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
