import { useState } from "react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { RecentCustomersTable } from "@/components/dashboard/RecentCustomersTable";
import { DateRangeFilter } from "@/components/dashboard/DateRangeFilter";
import { useDashboardAnalytics, getDateRangeFromPreset, type DateRangePreset } from "@/hooks/useDashboardAnalytics";

const Index = () => {
  const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>("30days");
  const initialDates = getDateRangeFromPreset("30days");
  const [customDates, setCustomDates] = useState<{ start: Date; end: Date }>({
    start: initialDates.startDate,
    end: initialDates.endDate,
  });

  const dateRange = selectedPreset === "custom" 
    ? { startDate: customDates.start, endDate: customDates.end }
    : getDateRangeFromPreset(selectedPreset);

  const { data, isLoading } = useDashboardAnalytics(dateRange.startDate, dateRange.endDate);

  const handlePresetChange = (preset: DateRangePreset) => {
    setSelectedPreset(preset);
  };

  const handleCustomDateChange = (start: Date, end: Date) => {
    setCustomDates({ start, end });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1" style={{ color: 'var(--text)' }}>Dashboard</h1>
          <p className="text-sm" style={{ color: 'var(--subtext)' }}>Visão geral das suas vendas e métricas</p>
        </div>
        <DateRangeFilter
          selectedPreset={selectedPreset}
          onPresetChange={handlePresetChange}
          customStartDate={customDates.start}
          customEndDate={customDates.end}
          onCustomDateChange={handleCustomDateChange}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Faturamento" value={data?.metrics.totalRevenue || "R$ 0,00"} showEye={false} isLoading={isLoading} />
        <MetricCard title="Vendas aprovadas" value={data?.metrics.paidRevenue || "R$ 0,00"} showEye={false} isLoading={isLoading} />
        <MetricCard title="Vendas pendentes" value={data?.metrics.pendingRevenue || "R$ 0,00"} showEye={false} isLoading={isLoading} />
        <MetricCard title="Taxas" value={data?.metrics.totalFees || "R$ 0,00"} showEye={false} isLoading={isLoading} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Checkouts Iniciados" value={data?.metrics.checkoutsStarted || 0} showEye={false} isLoading={isLoading} />
        <MetricCard title="Total de Vendas Aprovadas" value={data?.metrics.totalPaidOrders || 0} showEye={false} isLoading={isLoading} />
        <MetricCard title="Total de Vendas Pendentes" value={data?.metrics.totalPendingOrders || 0} showEye={false} isLoading={isLoading} />
        <MetricCard title="Taxa de Conversão" value={data?.metrics.conversionRate || "0%"} showEye={false} isLoading={isLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RevenueChart title="Faturamento" data={data?.chartData.map(d => ({ date: d.date, value: d.revenue })) || []} isLoading={isLoading} />
        <RevenueChart title="Taxas" data={data?.chartData.map(d => ({ date: d.date, value: d.fees })) || []} isLoading={isLoading} />
        <RevenueChart title="E-mails" data={data?.chartData.map(d => ({ date: d.date, value: d.emails })) || []} isLoading={isLoading} />
      </div>

      <RecentCustomersTable customers={data?.recentCustomers || []} isLoading={isLoading} />
    </div>
  );
};

export default Index;
