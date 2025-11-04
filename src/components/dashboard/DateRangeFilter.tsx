import { useState, useEffect, useRef } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>(
    customStartDate && customEndDate ? { from: customStartDate, to: customEndDate } : undefined
  );
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Mantém dropdown aberto quando calendário estiver aberto
  useEffect(() => {
    if (isCalendarOpen) {
      setIsDropdownOpen(true);
    }
  }, [isCalendarOpen]);

  // Limpa timeout quando componente desmonta
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const presets = [
    { value: "today" as const, label: "Hoje" },
    { value: "yesterday" as const, label: "Ontem" },
    { value: "7days" as const, label: "Últimos 7 dias" },
    { value: "30days" as const, label: "Últimos 30 dias" },
    { value: "max" as const, label: "Máximo" },
  ];

  const getPresetLabel = () => {
    if (selectedPreset === "custom" && dateRange?.from && dateRange?.to) {
      return `${format(dateRange.from, "dd/MM", { locale: ptBR })} - ${format(dateRange.to, "dd/MM", { locale: ptBR })}`;
    }
    const preset = presets.find((p) => p.value === selectedPreset);
    return preset?.label || "Selecione o período";
  };

  const handlePresetClick = (preset: DateRangePreset) => {
    onPresetChange(preset);
    setIsDropdownOpen(false);
  };

  const handleCalendarOpenChange = (open: boolean) => {
    setIsCalendarOpen(open);
    
    // Limpa timeout anterior se existir
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    if (!open) {
      // Armazena o timeout na ref
      timeoutRef.current = setTimeout(() => {
        setIsDropdownOpen(false);
        timeoutRef.current = null;
      }, 100);
    }
  };

  const handleDateSelect = (range: { from: Date; to?: Date } | undefined) => {
    if (range?.from && range?.to) {
      setDateRange({ from: range.from, to: range.to });
      onCustomDateChange(range.from, range.to);
      onPresetChange("custom");
      
      // Limpa timeout pendente antes de fechar
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      setIsCalendarOpen(false);
      setIsDropdownOpen(false);
    }
  };

  return (
    <DropdownMenu 
      open={isDropdownOpen} 
      onOpenChange={(open) => {
        // Só permite fechar se o calendário não estiver aberto
        if (!isCalendarOpen || !open) {
          setIsDropdownOpen(open);
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 min-w-[200px] justify-between">
          <span className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {getPresetLabel()}
          </span>
          <ChevronDown className="w-4 h-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[200px]">
        {presets.map((preset) => (
          <DropdownMenuItem
            key={preset.value}
            onClick={() => handlePresetClick(preset.value)}
            className={selectedPreset === preset.value ? "bg-accent" : ""}
          >
            {preset.label}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuItem 
          onSelect={(e) => e.preventDefault()}
          onClick={() => setIsCalendarOpen(true)}
        >
          <Popover 
            open={isCalendarOpen} 
            onOpenChange={handleCalendarOpenChange}
            modal={false}
          >
            <PopoverTrigger asChild>
              <div className="w-full flex items-center gap-2 cursor-pointer">
                <Calendar className="w-4 h-4" />
                Período personalizado
              </div>
            </PopoverTrigger>
            <PopoverContent 
              className="w-auto p-0" 
              align="end" 
              side="right"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
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
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
