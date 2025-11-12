import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface WebhookLogsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  webhookId: string;
  webhookName: string;
}

interface WebhookDelivery {
  id: string;
  event_type: string;
  status: string;
  response_status: number | null;
  response_body: string | null;
  attempts: number;
  last_attempt_at: string | null;
  created_at: string;
  payload: any;
}

const EVENT_LABELS: Record<string, string> = {
  pix_generated: "PIX Gerado",
  purchase_approved: "Compra Aprovada",
  purchase_refused: "Compra Recusada",
  refund: "Reembolso",
  chargeback: "Chargeback",
  checkout_abandoned: "Abandono de Checkout",
};

export function WebhookLogsDialog({
  open,
  onOpenChange,
  webhookId,
  webhookName,
}: WebhookLogsDialogProps) {
  const [logs, setLogs] = useState<WebhookDelivery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      loadLogs();
    }
  }, [open, webhookId]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('webhook_deliveries')
        .select('*')
        .eq('webhook_id', webhookId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading logs:', error);
        toast.error('Erro ao carregar logs');
        return;
      }

      setLogs(data || []);
    } catch (error) {
      console.error("Error loading logs:", error);
      toast.error("Erro ao carregar logs");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, statusCode: number | null) => {
    if (status === "success" && statusCode && statusCode >= 200 && statusCode < 300) {
      return <Badge className="bg-green-600">{statusCode}</Badge>;
    }
    if (statusCode && statusCode >= 400) {
      return <Badge variant="destructive">{statusCode}</Badge>;
    }
    if (status === "pending") {
      return <Badge variant="secondary">Pendente</Badge>;
    }
    if (status === "failed") {
      return <Badge variant="destructive">Falhou</Badge>;
    }
    return <Badge className="bg-green-600">{statusCode || "Sucesso"}</Badge>;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Logs</DialogTitle>
          <DialogDescription>
            Histórico de entregas do webhook: {webhookName}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm" style={{ color: "var(--subtext)" }}>
              Nenhum log encontrado ainda
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-2">
              {/* Header */}
              <div className="grid grid-cols-[2fr,1fr] gap-4 px-4 py-2 text-sm font-medium border-b" style={{ color: "var(--subtext)" }}>
                <div>Descrição</div>
                <div className="text-right">Status</div>
              </div>

              {/* Logs */}
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="grid grid-cols-[2fr,1fr] gap-4 items-center px-4 py-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-sm" style={{ color: "var(--text)" }}>
                      {EVENT_LABELS[log.event_type] || log.event_type}
                    </p>
                    <p className="text-xs" style={{ color: "var(--subtext)" }}>
                      {formatDate(log.created_at)}
                    </p>
                    {log.status === "failed" && log.response_body && (
                      <p className="text-xs text-red-500 mt-1">
                        Erro: {log.response_body.substring(0, 100)}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    {getStatusBadge(log.status, log.response_status)}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
