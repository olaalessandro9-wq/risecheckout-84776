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
import { format, startOfMonth, subMonths } from "date-fns";
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
  // Estados separados para cada calendário (arquitetura dual single)
  const [leftDate, setLeftDate] = useState<Date | undefined>();
  const [rightDate, setRightDate] = useState<Date | undefined>();
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

  // FASE 2: Estado de validação de data
  const [hasDateError, setHasDateError] = useState(false);

  // FASE 2: Monitora datas selecionadas e valida em tempo real
  useEffect(() => {
    if (leftDate && rightDate) {
      setHasDateError(rightDate <= leftDate);
    } else {
      setHasDateError(false);
    }
  }, [leftDate, rightDate]);

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

  // Função não é mais necessária - cada calendário gerencia sua própria data independentemente

  const handleApply = () => {
    console.log("✅ handleApply called", { leftDate, rightDate });

    // Validação: ambas as datas devem estar preenchidas
    if (!leftDate || !rightDate) {
      console.warn("⚠️ Ambas as datas devem ser selecionadas");
      return;
    }

    // Validação: data direita deve ser posterior à esquerda
    if (rightDate <= leftDate) {
      console.warn("⚠️ Data final deve ser posterior à data inicial");
      return;
    }

    // Aplica o filtro
    onCustomDateChange(leftDate, rightDate);
    onPresetChange("custom");
    setSavedDateRange({ from: leftDate, to: rightDate });
    setDateRange({ from: leftDate, to: rightDate });
    setIsCalendarOpen(false);
    setIsDropdownOpen(false);
  };

  const handleCancel = () => {
    console.log("🚫 handleCancel called");
    setLeftDate(undefined);
    setRightDate(undefined);
    setIsCalendarOpen(false);
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
              console.log("🔓 Opening calendar");
              // Se tem datas salvas, restaura elas; senão limpa
              if (savedDateRange?.from && savedDateRange?.to) {
                setLeftDate(savedDateRange.from);
                setRightDate(savedDateRange.to);
                setLeftMonth(startOfMonth(savedDateRange.from));
                setRightMonth(startOfMonth(savedDateRange.to));
              } else {
                setLeftDate(undefined);
                setRightDate(undefined);
              }
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
              <div className="flex flex-col gap-2">
                <span className="text-sm text-muted-foreground px-3 font-medium">
                  Data inicial
                </span>
                <CalendarComponent
                  mode="single"
                  selected={leftDate}
                  onSelect={setLeftDate}
                  month={leftMonth}
                  onMonthChange={setLeftMonth}
                  locale={ptBR}
                  fixedWeeks
                  className={cn("p-3 pointer-events-auto")}
                />
              </div>

              <div className="w-px bg-border/60 self-stretch" />

              <div className="flex flex-col gap-2">
                <span className="text-sm text-muted-foreground px-3 font-medium">
                  Data final
                </span>
                <CalendarComponent
                  mode="single"
                  selected={rightDate}
                  onSelect={setRightDate}
                  month={rightMonth}
                  onMonthChange={setRightMonth}
                  locale={ptBR}
                  fixedWeeks
                  className={cn("p-3 pointer-events-auto")}
                />
              </div>
            </div>

          {/* FASE 3: Mensagem de erro visual */}
          {hasDateError && (
            <div className="px-4 py-2 bg-destructive/10 border-t border-destructive/20">
              <p className="text-sm text-destructive font-medium">
                A data de início deve ser anterior à data de término.
              </p>
            </div>
          )}
          
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
              disabled={!leftDate || !rightDate || hasDateError}
              className={cn(
                hasDateError && "opacity-50 cursor-not-allowed"
              )}
            >
              Aplicar
            </Button>
          </div>
        </DialogContentWithoutClose>
      </Dialog>
    </>
  );
}
