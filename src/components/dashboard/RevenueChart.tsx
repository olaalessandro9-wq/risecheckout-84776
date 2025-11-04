import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Skeleton } from "@/components/ui/skeleton";

interface RevenueChartProps {
  title: string;
  data: Array<{ date: string; value: number }>;
  isLoading?: boolean;
}

export function RevenueChart({ title, data, isLoading = false }: RevenueChartProps) {
  return (
    <div className="relative bg-gradient-to-br from-card/80 to-card border border-border/50 rounded-2xl p-6 hover:border-primary/30 transition-all duration-300 overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
        </div>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis 
              dataKey="date" 
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '12px' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.75rem',
                color: 'hsl(var(--foreground))',
                boxShadow: '0 8px 32px hsl(0 0% 0% / 0.4)'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2.5}
              dot={{ fill: 'hsl(var(--primary))', r: 5, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
              activeDot={{ r: 7, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
            />
          </LineChart>
        </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
