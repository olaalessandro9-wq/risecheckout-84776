import { useState, useEffect, useRef } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContentWithoutClose,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const [tempDateRange, setTempDateRange] = useState<{ from: Date; to?: Date } | undefined>();
  const [savedDateRange, setSavedDateRange] = useState<{ from: Date; to: Date } | undefined>(
    customStartDate && customEndDate ? { from: customStartDate, to: customEndDate } : undefined
  );
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Estados para navegação independente dos calendários (estilo Cakto)
  const [leftMonth, setLeftMonth] = useState(new Date());
  const [rightMonth, setRightMonth] = useState(() => {
    const next = new Date();
    next.setMonth(next.getMonth() + 1);
    return next;
  });

  // Não precisa mais forçar dropdown aberto, arquitetura separada

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
    console.log('⚡ Preset clicked:', preset);
    onPresetChange(preset);
    setIsDropdownOpen(false);
  };

  const handleCalendarOpenChange = (open: boolean) => {
    console.log('📅 Calendar openChange:', open);
    setIsCalendarOpen(open);
    
    // Limpa timeout anterior se existir
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // NÃO fecha dropdown automaticamente quando calendário fecha
    // Deixa o usuário decidir se quer fechar ou escolher outro preset
  };

  const handleDateSelect = (range: { from: Date; to?: Date } | undefined) => {
    console.log('🔍 Date selected:', range);
    
    if (!range) {
      setTempDateRange(undefined);
      return;
    }

    // Se já tem um range completo (from + to) e clica em nova data, reinicia
    if (tempDateRange?.from && tempDateRange?.to && range.from) {
      setTempDateRange({ from: range.from, to: undefined });
      return;
    }

    // Se só tem 'from', é o primeiro clique
    if (range.from && !range.to) {
      setTempDateRange({ from: range.from, to: undefined });
      return;
    }

    // Se tem 'from' e 'to', é o segundo clique (range completo)
    if (range.from && range.to) {
      // Garante que 'to' é sempre depois de 'from'
      if (range.to < range.from) {
        setTempDateRange({ from: range.to, to: range.from });
      } else {
        setTempDateRange({ from: range.from, to: range.to });
      }
      return;
    }
  };

  const handleApply = () => {
    console.log('✅ handleApply called', tempDateRange);
    if (tempDateRange?.from && tempDateRange?.to) {
      const completeRange = { from: tempDateRange.from, to: tempDateRange.to };
      onCustomDateChange(completeRange.from, completeRange.to);
      onPresetChange("custom");
      setSavedDateRange(completeRange);
      setDateRange(completeRange);
      setIsCalendarOpen(false);
      setIsDropdownOpen(false); // Fecha tudo ao aplicar
    }
  };

  const handleCancel = () => {
    console.log('🚫 handleCancel called');
    setTempDateRange(undefined); // Limpa seleção ao cancelar
    setIsCalendarOpen(false); // Fecha apenas o calendário, mantém dropdown aberto
  };

  return (
    <>
      <DropdownMenu 
        open={isDropdownOpen} 
        onOpenChange={(open) => {
          console.log('🔽 Dropdown onOpenChange:', open);
          setIsDropdownOpen(open);
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
            onClick={() => {
              console.log('🔓 Opening calendar');
              setTempDateRange(undefined); // Calendário limpo, sem pré-seleção
              setIsCalendarOpen(true);
              setIsDropdownOpen(false);
            }}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Período personalizado
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog 
        open={isCalendarOpen} 
        onOpenChange={handleCalendarOpenChange}
      >
        <DialogContentWithoutClose className="max-w-fit p-0">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle>Selecionar período personalizado</DialogTitle>
          </DialogHeader>
          
          <div className="flex gap-4 p-4">
            <CalendarComponent
              mode="range"
              selected={tempDateRange}
              onSelect={handleDateSelect}
              month={leftMonth}
              onMonthChange={setLeftMonth}
              locale={ptBR}
              fixedWeeks
              className={cn("p-3 pointer-events-auto")}
            />
            <div className="w-px bg-border/60" />
            <CalendarComponent
              mode="range"
              selected={tempDateRange}
              onSelect={handleDateSelect}
              month={rightMonth}
              onMonthChange={setRightMonth}
              locale={ptBR}
              fixedWeeks
              className={cn("p-3 pointer-events-auto")}
            />
          </div>
          
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border/60 bg-muted/30">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleCancel();
              }}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleApply();
              }}
              disabled={!tempDateRange?.from || !tempDateRange?.to}
            >
              Aplicar
            </Button>
          </div>
        </DialogContentWithoutClose>
      </Dialog>
    </>
  );
}
