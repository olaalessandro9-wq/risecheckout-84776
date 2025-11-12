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
  order_id: string | null;
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
  const [selectedLog, setSelectedLog] = useState<WebhookDelivery | null>(null);

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
      // Selecionar o primeiro log automaticamente
      if (data && data.length > 0) {
        setSelectedLog(data[0]);
      }
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
      <DialogContent className="sm:max-w-[1200px] max-h-[80vh]">
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
          <div className="grid grid-cols-[1fr,1.5fr] gap-6 h-[500px]">
            {/* Lista de Logs (Esquerda) */}
            <div className="border-r pr-4">
              <ScrollArea className="h-full">
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
                      onClick={() => setSelectedLog(log)}
                      className={`grid grid-cols-[2fr,1fr] gap-4 items-center px-4 py-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedLog?.id === log.id
                          ? "bg-accent border-primary"
                          : "border-border hover:bg-accent/50"
                      }`}
                    >
                      <div>
                        <p className="font-medium text-sm" style={{ color: "var(--text)" }}>
                          {EVENT_LABELS[log.event_type] || log.event_type}
                        </p>
                        <p className="text-xs" style={{ color: "var(--subtext)" }}>
                          {formatDate(log.created_at)}
                        </p>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(log.status, log.response_status)}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Painel de Detalhes (Direita) */}
            <div className="pl-4">
              {selectedLog ? (
                <ScrollArea className="h-full">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold" style={{ color: "var(--text)" }}>
                      Detalhes
                    </h3>

                    {/* URL de Destino */}
                    <div>
                      <p className="text-xs font-medium mb-1" style={{ color: "var(--subtext)" }}>
                        URL de destino:
                      </p>
                      <p className="text-sm font-mono bg-accent px-3 py-2 rounded break-all" style={{ color: "var(--text)" }}>
                        {selectedLog.payload?.webhook_url || "N/A"}
                      </p>
                    </div>

                    {/* Data de Envio */}
                    <div>
                      <p className="text-xs font-medium mb-1" style={{ color: "var(--subtext)" }}>
                        Data de envio:
                      </p>
                      <p className="text-sm" style={{ color: "var(--text)" }}>
                        {formatDate(selectedLog.created_at)}
                      </p>
                    </div>

                    {/* Order ID */}
                    {selectedLog.order_id && (
                      <div>
                        <p className="text-xs font-medium mb-1" style={{ color: "var(--subtext)" }}>
                          Order ID:
                        </p>
                        <p className="text-sm font-mono bg-accent px-3 py-2 rounded break-all" style={{ color: "var(--text)" }}>
                          {selectedLog.order_id}
                        </p>
                      </div>
                    )}

                    {/* Status */}
                    <div>
                      <p className="text-xs font-medium mb-1" style={{ color: "var(--subtext)" }}>
                        Status:
                      </p>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(selectedLog.status, selectedLog.response_status)}
                        <span className="text-xs" style={{ color: "var(--subtext)" }}>
                          {selectedLog.attempts} tentativa(s)
                        </span>
                      </div>
                    </div>

                    {/* Response Body (se houver erro) */}
                    {selectedLog.response_body && (
                      <div>
                        <p className="text-xs font-medium mb-1" style={{ color: "var(--subtext)" }}>
                          Resposta:
                        </p>
                        <pre className="text-xs bg-accent px-3 py-2 rounded overflow-auto max-h-32" style={{ color: "var(--text)" }}>
                          {selectedLog.response_body}
                        </pre>
                      </div>
                    )}

                    {/* Conteúdo Enviado */}
                    <div>
                      <p className="text-xs font-medium mb-1" style={{ color: "var(--subtext)" }}>
                        Conteúdo Enviado:
                      </p>
                      <pre className="text-xs bg-accent px-3 py-2 rounded overflow-auto max-h-96" style={{ color: "var(--text)" }}>
                        {JSON.stringify(selectedLog.payload, null, 2)}
                      </pre>
                    </div>
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm" style={{ color: "var(--subtext)" }}>
                    Selecione um log para ver os detalhes
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
