import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TestWebhookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  webhookId: string;
  webhookName: string;
  webhookUrl: string;
}

const AVAILABLE_EVENTS = [
  { value: "pix_generated", label: "PIX Gerado", description: "Quando o QR Code do PIX é gerado" },
  { value: "purchase_approved", label: "Compra Aprovada", description: "Quando o pagamento é confirmado" },
  { value: "purchase_refused", label: "Compra Recusada", description: "Quando o pagamento é recusado (cartão)" },
  { value: "refund", label: "Reembolso", description: "Quando um pedido é reembolsado" },
  { value: "chargeback", label: "Chargeback", description: "Quando ocorre um chargeback" },
  { value: "checkout_abandoned", label: "Abandono de Checkout", description: "Quando o cliente abandona o checkout" },
];

export function TestWebhookDialog({
  open,
  onOpenChange,
  webhookId,
  webhookName,
  webhookUrl,
}: TestWebhookDialogProps) {
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [sending, setSending] = useState(false);

  const handleSendTest = async () => {
    if (!selectedEvent) {
      toast.error("Selecione um evento");
      return;
    }

    setSending(true);
    try {
      // Criar payload de teste
      const testPayload = {
        event: selectedEvent,
        test_mode: true,
        order: {
          id: "test_order_123",
          status: selectedEvent === "purchase_approved" ? "paid" : "pending",
          total_amount: 50.00,
          payment_method: "pix",
          paid_at: selectedEvent === "purchase_approved" ? new Date().toISOString() : null,
          created_at: new Date().toISOString(),
        },
        customer: {
          name: "Cliente Teste",
          email: "teste@example.com",
        },
        product: {
          id: "test_product_123",
          name: "Produto de Teste",
          description: "Descrição do produto de teste",
          price: 50.00,
        },
        timestamp: new Date().toISOString(),
      };

      // Enviar através de uma Edge Function auxiliar que faz o POST
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/send-webhook-test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          webhook_id: webhookId,
          webhook_url: webhookUrl,
          event_type: selectedEvent,
          payload: testPayload,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(`Evento de teste enviado! Status: ${result.status_code}`);
        onOpenChange(false);
      } else {
        toast.error(`Erro ao enviar: ${result.error || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error("Error sending test event:", error);
      toast.error("Erro ao enviar evento de teste");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Enviar Evento de Teste</DialogTitle>
          <DialogDescription>
            Teste seu webhook enviando um evento simulado
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label style={{ color: "var(--text)" }}>Webhook</Label>
            <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
              {webhookName}
            </p>
            <p className="text-xs font-mono" style={{ color: "var(--subtext)" }}>
              {webhookUrl}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="test-event" style={{ color: "var(--text)" }}>
              Evento <span className="text-red-500">*</span>
            </Label>
            <Select value={selectedEvent} onValueChange={setSelectedEvent}>
              <SelectTrigger id="test-event">
                <SelectValue placeholder="Selecione um evento" />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_EVENTS.map((event) => (
                  <SelectItem key={event.value} value={event.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{event.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {event.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg bg-muted p-3">
            <p className="text-xs" style={{ color: "var(--subtext)" }}>
              ℹ️ Este é um evento de teste. O payload será marcado com{" "}
              <code className="bg-background px-1 rounded">test_mode: true</code> e
              o header <code className="bg-background px-1 rounded">X-Rise-Test: true</code>
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSendTest} disabled={sending || !selectedEvent}>
              {sending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Enviar Teste
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
