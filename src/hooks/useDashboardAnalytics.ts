import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { addDays, startOfDay, endOfDay, subDays } from "date-fns";

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

export function useDashboardAnalytics(startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: ["dashboard-analytics", startDate.toISOString(), endDate.toISOString()],
    queryFn: async (): Promise<DashboardData> => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Usuário não autenticado");
      }

      const { data, error } = await supabase.functions.invoke("dashboard-analytics", {
        body: {
          startDate: startOfDay(startDate).toISOString(),
          endDate: endOfDay(endDate).toISOString(),
        },
      });

      if (error) throw error;
      return data;
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
