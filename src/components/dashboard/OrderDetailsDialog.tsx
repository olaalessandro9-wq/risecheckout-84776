import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

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
    status: "Pago" | "Pendente";
    createdAt: string;
  } | null;
}

export function OrderDetailsDialog({ open, onOpenChange, orderData }: OrderDetailsDialogProps) {
  if (!orderData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Detalhes da Compra</span>
            <Badge 
              variant={orderData.status === "Pago" ? "default" : "secondary"}
              className={orderData.status === "Pago" ? "bg-success/20 text-success hover:bg-success/30" : ""}
            >
              {orderData.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* ID da Compra */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">ID da Compra</label>
            <p className="text-sm font-mono bg-muted/50 p-2 rounded-md break-all">{orderData.id}</p>
          </div>

          <Separator />

          {/* Produto */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Produto</label>
            <div className="flex items-center gap-3">
              <img 
                src={orderData.productImageUrl} 
                alt={orderData.productName}
                className="w-16 h-16 rounded-md object-cover border border-border"
                onError={(e) => {
                  e.currentTarget.src = '/placeholder.svg';
                }}
              />
              <p className="text-sm font-medium">{orderData.productName}</p>
            </div>
          </div>

          <Separator />

          {/* Cliente */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">Cliente</label>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-sm text-muted-foreground w-20">Nome:</span>
                <span className="text-sm font-medium">{orderData.customerName}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-sm text-muted-foreground w-20">Email:</span>
                <span className="text-sm font-medium break-all">{orderData.customerEmail}</span>
              </div>
              {orderData.customerPhone && orderData.customerPhone !== 'N/A' && (
                <div className="flex items-start gap-2">
                  <span className="text-sm text-muted-foreground w-20">Telefone:</span>
                  <span className="text-sm font-medium">{orderData.customerPhone}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Pagamento */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">Pagamento</label>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Valor:</span>
                <span className="text-lg font-bold text-primary">{orderData.amount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge 
                  variant={orderData.status === "Pago" ? "default" : "secondary"}
                  className={orderData.status === "Pago" ? "bg-success/20 text-success hover:bg-success/30" : ""}
                >
                  {orderData.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Data:</span>
                <span className="text-sm font-medium">{orderData.createdAt}</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
