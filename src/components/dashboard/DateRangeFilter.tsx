import { useState } from "react";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DateRangePreset } from "@/hooks/useDashboardAnalytics";

interface DateRangeFilterProps {
  selectedPreset: DateRangePreset;
  onPresetChange: (preset: DateRangePreset) => void;
  customStartDate?: Date;
  customEndDate?: Date;
  onCustomDateChange: (start: Date, end: Date) => void;
}

export function DateRangeFilter({
  selectedPreset,
  onPresetChange,
  customStartDate,
  customEndDate,
  onCustomDateChange,
}: DateRangeFilterProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>(
    customStartDate && customEndDate ? { from: customStartDate, to: customEndDate } : undefined
  );

  const presets = [
    { value: "today" as const, label: "Hoje" },
    { value: "yesterday" as const, label: "Ontem" },
    { value: "7days" as const, label: "Últimos 7 dias" },
    { value: "30days" as const, label: "Últimos 30 dias" },
    { value: "max" as const, label: "Máximo" },
  ];

  const handleDateSelect = (range: { from: Date; to?: Date } | undefined) => {
    if (range?.from && range?.to) {
      setDateRange({ from: range.from, to: range.to });
      onCustomDateChange(range.from, range.to);
      onPresetChange("custom");
      setIsCalendarOpen(false);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {presets.map((preset) => (
        <Button
          key={preset.value}
          variant={selectedPreset === preset.value ? "default" : "outline"}
          size="sm"
          onClick={() => onPresetChange(preset.value)}
        >
          {preset.label}
        </Button>
      ))}
      
      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={selectedPreset === "custom" ? "default" : "outline"}
            size="sm"
            className="gap-2"
          >
            <Calendar className="w-4 h-4" />
            {selectedPreset === "custom" && dateRange.from && dateRange.to
              ? `${format(dateRange.from, "dd/MM", { locale: ptBR })} - ${format(dateRange.to, "dd/MM", { locale: ptBR })}`
              : "Período personalizado"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <CalendarComponent
            mode="range"
            selected={dateRange}
            onSelect={handleDateSelect}
            numberOfMonths={2}
            locale={ptBR}
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
