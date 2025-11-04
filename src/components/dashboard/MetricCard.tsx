import { Card } from "@/components/ui/card";
import { Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface MetricCardProps {
  title: string;
  value: string | number;
  showEye?: boolean;
  isLoading?: boolean;
}

export function MetricCard({ title, value, showEye = true, isLoading = false }: MetricCardProps) {
  return (
    <div className="relative bg-gradient-to-br from-card/80 to-card border border-border/50 rounded-2xl p-6 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 group overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground font-medium">{title}</span>
          {showEye && (
            <Eye className="w-4 h-4 text-muted-foreground/50 hover:text-primary transition-colors cursor-pointer" />
          )}
        </div>
        {isLoading ? (
          <Skeleton className="h-9 w-32" />
        ) : (
          <p className="text-3xl font-bold text-foreground tracking-tight">{value}</p>
        )}
      </div>
    </div>
  );
}
