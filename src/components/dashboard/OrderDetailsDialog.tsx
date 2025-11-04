import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Package, User, Mail, Phone, CreditCard, Calendar, CheckCircle2, Clock, XCircle } from "lucide-react";

interface OrderDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderData: {
    id: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    productName: string;
    productImageUrl: string;
    amount: string;
    status: "Pago" | "Pendente" | "Reembolso" | "Chargeback";
    createdAt: string;
  } | null;
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case "Pago":
      return {
        color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
        icon: CheckCircle2,
        iconColor: "text-emerald-600",
        gradient: "from-emerald-500/5 to-transparent"
      };
    case "Pendente":
      return {
        color: "bg-amber-500/10 text-amber-700 border-amber-500/20",
        icon: Clock,
        iconColor: "text-amber-600",
        gradient: "from-amber-500/5 to-transparent"
      };
    case "Reembolso":
    case "Chargeback":
      return {
        color: "bg-red-500/10 text-red-700 border-red-500/20",
        icon: XCircle,
        iconColor: "text-red-600",
        gradient: "from-red-500/5 to-transparent"
      };
    default:
      return {
        color: "bg-gray-500/10 text-gray-700 border-gray-500/20",
        icon: Clock,
        iconColor: "text-gray-600",
        gradient: "from-gray-500/5 to-transparent"
      };
  }
};

export function OrderDetailsDialog({ open, onOpenChange, orderData }: OrderDetailsDialogProps) {
  if (!orderData) return null;

  const statusConfig = getStatusConfig(orderData.status);
  const StatusIcon = statusConfig.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header com gradiente baseado no status */}
        <div className={`relative bg-gradient-to-br ${statusConfig.gradient} p-4 pb-5`}>
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between text-lg">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${statusConfig.color} border`}>
                  <StatusIcon className={`w-4 h-4 ${statusConfig.iconColor}`} />
                </div>
                <span>Detalhes da Compra</span>
              </div>
              <Badge 
                className={`${statusConfig.color} border px-2 py-0.5 text-xs font-semibold`}
              >
                {orderData.status}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {/* ID da Compra em destaque */}
          <div className="mt-3 space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">ID da Compra</label>
            <p className="text-xs font-mono bg-background/50 backdrop-blur-sm p-2 rounded-lg border border-border/50 break-all">
              {orderData.id}
            </p>
          </div>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Produto - Card destacado */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Package className="w-3.5 h-3.5" />
              <span>Produto</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
              <div className="relative">
                <img 
                  src={orderData.productImageUrl} 
                  alt={orderData.productName}
                  className="w-14 h-14 rounded-md object-cover border border-border shadow-sm"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder.svg';
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground truncate">{orderData.productName}</p>
                <p className="text-xs text-muted-foreground">Produto digital</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Cliente - Grid organizado */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <User className="w-3.5 h-3.5" />
              <span>Informações do Cliente</span>
            </div>
            <div className="grid gap-2">
              <div className="flex items-center gap-2 p-2 rounded-md bg-muted/30">
                <div className="p-1.5 rounded-md bg-background">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Nome</p>
                  <p className="text-sm font-medium text-foreground truncate">{orderData.customerName}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 p-2 rounded-md bg-muted/30">
                <div className="p-1.5 rounded-md bg-background">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-xs font-medium text-foreground break-all">{orderData.customerEmail}</p>
                </div>
              </div>

              {orderData.customerPhone && orderData.customerPhone !== 'N/A' && (
                <div className="flex items-center gap-2 p-2 rounded-md bg-muted/30">
                  <div className="p-1.5 rounded-md bg-background">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Telefone</p>
                    <p className="text-sm font-medium text-foreground">{orderData.customerPhone}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Pagamento - Destaque para o valor */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <CreditCard className="w-3.5 h-3.5" />
              <span>Informações de Pagamento</span>
            </div>
            <div className="space-y-2">
              {/* Valor em destaque */}
              <div className={`p-3 rounded-lg border-2 ${statusConfig.color} border`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Valor Total</span>
                  <span className={`text-xl font-bold ${statusConfig.iconColor}`}>{orderData.amount}</span>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between p-2 rounded-md bg-muted/30">
                <span className="text-xs text-muted-foreground">Status do Pagamento</span>
                <Badge 
                  className={`${statusConfig.color} border px-2 py-0.5 text-xs font-semibold`}
                >
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {orderData.status}
                </Badge>
              </div>

              {/* Data */}
              <div className="flex items-center justify-between p-2 rounded-md bg-muted/30">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Data da Compra</span>
                </div>
                <span className="text-xs font-medium text-foreground">{orderData.createdAt}</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
