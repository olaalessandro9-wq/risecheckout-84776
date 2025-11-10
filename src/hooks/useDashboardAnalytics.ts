import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { addDays, startOfDay, endOfDay, subDays, format } from "date-fns";

export type DateRangePreset = "today" | "yesterday" | "7days" | "30days" | "max" | "custom";

interface DashboardMetrics {
  totalRevenue: string;
  paidRevenue: string;
  pendingRevenue: string;
  totalFees: string;
  checkoutsStarted: number;
  totalPaidOrders: number;
  totalPendingOrders: number;
  conversionRate: string;
}

interface ChartDataPoint {
  date: string;
  revenue: number;
  fees: number;
  emails: number;
}

interface RecentCustomer {
  id: string;
  orderId: string;
  offer: string;
  client: string;
  phone: string;
  email: string;
  createdAt: string;
  value: string;
  status: "Pago" | "Pendente" | "Reembolso" | "Chargeback";
  // Dados completos para o dialog
  productName: string;
  productImageUrl: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  fullCreatedAt: string;
}

interface DashboardData {
  metrics: DashboardMetrics;
  chartData: ChartDataPoint[];
  recentCustomers: RecentCustomer[];
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(cents / 100);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function translateStatus(status: string): "Pago" | "Pendente" | "Reembolso" | "Chargeback" {
  const statusMap: Record<string, "Pago" | "Pendente" | "Reembolso" | "Chargeback"> = {
    'paid': 'Pago',
    'pending': 'Pendente',
    'refunded': 'Reembolso',
    'chargeback': 'Chargeback'
  };
  return statusMap[status?.toLowerCase()] || 'Pendente';
}

export function useDashboardAnalytics(startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: ["dashboard-analytics", startDate.toISOString(), endDate.toISOString()],
    queryFn: async (): Promise<DashboardData> => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Usuário não autenticado");
      }

      const vendorId = session.user.id;

      // Buscar pedidos do período
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select(`
          id,
          customer_name,
          customer_email,
          amount_cents,
          status,
          created_at,
          paid_at,
          product:product_id (
            id,
            name,
            image_url
          )
        `)
        .eq("vendor_id", vendorId)
        .gte("created_at", startOfDay(startDate).toISOString())
        .lte("created_at", endOfDay(endDate).toISOString())
        .order("created_at", { ascending: false });

      if (ordersError) {
        console.error("[useDashboardAnalytics] Erro ao buscar pedidos:", ordersError);
        throw ordersError;
      }

      console.log("[useDashboardAnalytics] Pedidos encontrados:", orders?.length || 0);

      // Calcular métricas (case-insensitive)
      const paidOrders = orders?.filter(o => o.status?.toLowerCase() === "paid") || [];
      const pendingOrders = orders?.filter(o => o.status?.toLowerCase() === "pending") || [];

      const totalRevenue = paidOrders.reduce((sum, o) => sum + (o.amount_cents || 0), 0);
      const pendingRevenue = pendingOrders.reduce((sum, o) => sum + (o.amount_cents || 0), 0);
      
      // Calcular taxas (assumindo 3.99% + R$ 0,39 por transação)
      const totalFees = paidOrders.reduce((sum, o) => {
        const amount = o.amount_cents || 0;
        const fee = Math.round(amount * 0.0399) + 39;
        return sum + fee;
      }, 0);

      const metrics: DashboardMetrics = {
        totalRevenue: formatCurrency(totalRevenue),
        paidRevenue: formatCurrency(totalRevenue),
        pendingRevenue: formatCurrency(pendingRevenue),
        totalFees: formatCurrency(totalFees),
        checkoutsStarted: orders?.length || 0,
        totalPaidOrders: paidOrders.length,
        totalPendingOrders: pendingOrders.length,
        conversionRate: orders?.length > 0 
          ? `${((paidOrders.length / orders.length) * 100).toFixed(2)}%`
          : "0%"
      };

      // Agrupar dados por dia para o gráfico
      const chartDataMap = new Map<string, ChartDataPoint>();
      
      orders?.forEach(order => {
        const date = format(new Date(order.created_at), 'yyyy-MM-dd');
        
        if (!chartDataMap.has(date)) {
          chartDataMap.set(date, {
            date,
            revenue: 0,
            fees: 0,
            emails: 0
          });
        }

        const dataPoint = chartDataMap.get(date)!;
        
        if (order.status?.toLowerCase() === "paid") {
          dataPoint.revenue += (order.amount_cents || 0) / 100;
          const fee = Math.round((order.amount_cents || 0) * 0.0399) + 39;
          dataPoint.fees += fee / 100;
        }
        
        if (order.customer_email) {
          dataPoint.emails += 1;
        }
      });

      const chartData = Array.from(chartDataMap.values());

      // Formatar clientes recentes
      const recentCustomers: RecentCustomer[] = (orders || []).slice(0, 50).map(order => {
        const product = Array.isArray(order.product) ? order.product[0] : order.product;
        
        return {
          id: order.id.substring(0, 8),
          orderId: order.id,
          offer: product?.name || "Produto não encontrado",
          client: order.customer_name || "N/A",
          phone: "N/A",
          email: order.customer_email || "N/A",
          createdAt: formatDate(order.created_at),
          value: formatCurrency(order.amount_cents || 0),
          status: translateStatus(order.status),
          productName: product?.name || "Produto não encontrado",
          productImageUrl: product?.image_url || "",
          customerName: order.customer_name || "N/A",
          customerEmail: order.customer_email || "N/A",
          customerPhone: "N/A",
          fullCreatedAt: order.created_at
        };
      });

      return {
        metrics,
        chartData,
        recentCustomers
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

export function getDateRangeFromPreset(preset: DateRangePreset): { startDate: Date; endDate: Date } {
  const now = new Date();
  
  switch (preset) {
    case "today":
      return { startDate: startOfDay(now), endDate: endOfDay(now) };
    
    case "yesterday":
      const yesterday = subDays(now, 1);
      return { startDate: startOfDay(yesterday), endDate: endOfDay(yesterday) };
    
    case "7days":
      return { startDate: startOfDay(subDays(now, 7)), endDate: endOfDay(now) };
    
    case "30days":
      return { startDate: startOfDay(subDays(now, 30)), endDate: endOfDay(now) };
    
    case "max":
      return { startDate: new Date("2020-01-01"), endDate: endOfDay(now) };
    
    default:
      return { startDate: startOfDay(now), endDate: endOfDay(now) };
  }
}
