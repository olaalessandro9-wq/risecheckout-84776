import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MoreVertical, Send, Edit, FileText, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TestWebhookDialog } from "./TestWebhookDialog";
import { WebhookLogsDialog } from "./WebhookLogsDialog";

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  product_id: string | null;
  product?: {
    name: string;
  };
}

interface WebhooksListProps {
  webhooks: Webhook[];
  onEdit: (webhook: Webhook) => void;
  onDelete: (webhookId: string) => Promise<void>;
  selectedProduct: string;
}

export function WebhooksList({ webhooks, onEdit, onDelete, selectedProduct }: WebhooksListProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [webhookToDelete, setWebhookToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testWebhook, setTestWebhook] = useState<Webhook | null>(null);
  
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [logsWebhook, setLogsWebhook] = useState<Webhook | null>(null);

  const handleDeleteClick = (webhookId: string) => {
    setWebhookToDelete(webhookId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!webhookToDelete) return;

    setDeleting(true);
    try {
      await onDelete(webhookToDelete);
      setDeleteDialogOpen(false);
      setWebhookToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleTestClick = (webhook: Webhook) => {
    setTestWebhook(webhook);
    setTestDialogOpen(true);
  };

  const handleLogsClick = (webhook: Webhook) => {
    setLogsWebhook(webhook);
    setLogsDialogOpen(true);
  };

  // Filtrar webhooks por produto selecionado
  const filteredWebhooks = selectedProduct === "all"
    ? webhooks
    : webhooks.filter(w => w.product_id === selectedProduct);

  if (filteredWebhooks.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm" style={{ color: "var(--subtext)" }}>
          Nenhum webhook configurado ainda
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {/* Header */}
        <div className="grid grid-cols-[2fr,3fr] gap-4 px-4 py-2 text-sm font-medium" style={{ color: "var(--subtext)" }}>
          <div>Nome</div>
          <div>URL</div>
        </div>

        {/* Lista de webhooks */}
        {filteredWebhooks.map((webhook) => (
          <div
            key={webhook.id}
            className="grid grid-cols-[2fr,3fr,auto] gap-4 items-center px-4 py-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
          >
            <div>
              <p className="font-medium text-sm" style={{ color: "var(--text)" }}>
                {webhook.name}
              </p>
            </div>
            
            <div className="font-mono text-xs" style={{ color: "var(--subtext)" }}>
              {webhook.url}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleTestClick(webhook)}>
                  <Send className="mr-2 h-4 w-4" />
                  Enviar evento de teste
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(webhook)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleLogsClick(webhook)}>
                  <FileText className="mr-2 h-4 w-4" />
                  Logs
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleDeleteClick(webhook.id)}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>

      {/* Dialog de exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este webhook? Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de teste */}
      {testWebhook && (
        <TestWebhookDialog
          open={testDialogOpen}
          onOpenChange={setTestDialogOpen}
          webhookId={testWebhook.id}
          webhookName={testWebhook.name}
          webhookUrl={testWebhook.url}
        />
      )}

      {/* Dialog de logs */}
      {logsWebhook && (
        <WebhookLogsDialog
          open={logsDialogOpen}
          onOpenChange={setLogsDialogOpen}
          webhookId={logsWebhook.id}
          webhookName={logsWebhook.name}
        />
      )}
    </>
  );
}
