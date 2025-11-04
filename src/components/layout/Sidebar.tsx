// src/components/layout/Sidebar.tsx
import {
  LayoutDashboard,
  Package,
  Users,
  Banknote,
  Plug,
  Cog,
  LifeBuoy,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { HELP_CENTER_URL, SUPPORT_WHATSAPP_URL } from "@/lib/links";
import { UserFooter } from "./UserFooter";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import clsx from "clsx";
import { useState, useEffect } from "react";

type Item = { label: string; icon: React.ElementType; to?: string; external?: string };
type Section = { title: string; items: Item[] };

// Ajuste de altura do brand no topo do sidebar
const BRAND_H = 68; // px (maior que antes; menor que o Rise Insights)

// Função que retorna estrutura dinâmica baseada no estado do sidebar
const getNavSections = (isCollapsed: boolean): Section[] => {
  if (isCollapsed) {
    // Quando MINIMIZADO: Configurações em OPERAÇÕES
    // WhatsApp e Ajuda vão para o rodapé (não aparecem aqui)
    return [
      {
        title: "NAVEGAÇÃO",
        items: [
          { label: "Dashboard", icon: LayoutDashboard, to: "/" },
          { label: "Produtos", icon: Package, to: "/produtos" },
          { label: "Afiliados", icon: Users, to: "/afiliados" },
        ],
      },
      {
        title: "OPERAÇÕES",
        items: [
          { label: "Financeiro", icon: Banknote, to: "/financeiro" },
          { label: "Integrações", icon: Plug, to: "/integracoes" },
          { label: "Configurações", icon: Cog, to: "/config" },
        ],
      },
    ];
  } else {
    // Quando EXPANDIDO: Configurações em OPERAÇÕES, SISTEMA vira SUPORTE
    return [
      {
        title: "NAVEGAÇÃO",
        items: [
          { label: "Dashboard", icon: LayoutDashboard, to: "/" },
          { label: "Produtos", icon: Package, to: "/produtos" },
          { label: "Afiliados", icon: Users, to: "/afiliados" },
        ],
      },
      {
        title: "OPERAÇÕES",
        items: [
          { label: "Financeiro", icon: Banknote, to: "/financeiro" },
          { label: "Integrações", icon: Plug, to: "/integracoes" },
          { label: "Configurações", icon: Cog, to: "/config" },
        ],
      },
      {
        title: "SUPORTE",
        items: [
          { label: "Suporte pelo WhatsApp", icon: LifeBuoy, external: SUPPORT_WHATSAPP_URL },
          { label: "Ajuda", icon: HelpCircle, external: HELP_CENTER_URL },
        ],
      },
    ];
  }
};

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);

  return (
    <aside
      className={clsx(
        "flex h-screen shrink-0 flex-col border-r border-border/60 bg-background text-foreground transition-all duration-300",
        isCollapsed ? "w-20" : "w-[248px]"
      )}
    >
      {/* Brand / Logo */}
      <div
        className={clsx(
          "flex items-center border-b border-border/60",
          isCollapsed ? "justify-center px-2" : "justify-between px-4"
        )}
        style={{ height: BRAND_H }}
      >
        {!isCollapsed && (
          <div className="text-lg font-semibold tracking-tight overflow-hidden">
            RiseCheckout
          </div>
        )}
        
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-md hover:bg-muted transition-colors"
          title={isCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navegação */}
      <TooltipProvider delayDuration={300}>
        <nav className={clsx(
          "scrollbar-none flex-1 overflow-y-auto py-4 transition-all",
          isCollapsed ? "px-2" : "px-2"
        )}>
          {getNavSections(isCollapsed).map((section) => (
            <div key={section.title} className="mb-4">
              {!isCollapsed && (
                <div className="px-2 pb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80">
                  {section.title}
                </div>
              )}
              <ul className={clsx(isCollapsed ? "space-y-1.5" : "space-y-1")}>
                {section.items.map((it) => {
                  const Icon = it.icon;
                  const content = it.external ? (
                    <a
                      href={it.external}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={rowClass(undefined, isCollapsed)}
                    >
                      <Icon className={isCollapsed ? "h-5 w-5 shrink-0 mx-auto" : "h-4 w-4"} />
                      {!isCollapsed && <span>{it.label}</span>}
                    </a>
                  ) : (
                    <NavLink 
                      to={it.to!} 
                      className={({ isActive }) => rowClass(isActive, isCollapsed)}
                    >
                      <Icon className={isCollapsed ? "h-5 w-5 shrink-0 mx-auto" : "h-4 w-4"} />
                      {!isCollapsed && <span>{it.label}</span>}
                    </NavLink>
                  );

                  if (isCollapsed) {
                    return (
                      <li key={it.label} className="flex">
                        <Tooltip>
                          <TooltipTrigger asChild className="flex-1">
                            {content}
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            {it.label}
                          </TooltipContent>
                        </Tooltip>
                      </li>
                    );
                  }

                  return <li key={it.label}>{content}</li>;
                })}
              </ul>
            </div>
          ))}
        </nav>
      </TooltipProvider>

      {/* Rodapé com email + sair */}
      <UserFooter isCollapsed={isCollapsed} />
    </aside>
  );
}

function rowClass(active?: boolean, collapsed?: boolean) {
  return clsx(
    "group flex items-center rounded-md text-sm transition w-full",
    collapsed ? "justify-center px-4 py-3" : "gap-3 px-2 py-2",
    active
      ? "bg-muted text-foreground font-medium"
      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
  );
}
