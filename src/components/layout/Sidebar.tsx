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
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { HELP_CENTER_URL, SUPPORT_WHATSAPP_URL } from "@/lib/links";
import { UserFooter } from "./UserFooter";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import clsx from "clsx";
import { useState } from "react";
import { motion } from "framer-motion";

type Item = { label: string; icon: React.ElementType; to?: string; external?: string };

// Ajuste de altura do brand no topo do sidebar
const BRAND_H = 88; // px

// Lista única de itens de navegação (sem seções)
const navItems: Item[] = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/" },
  { label: "Produtos", icon: Package, to: "/produtos" },
  { label: "Afiliados", icon: Users, to: "/afiliados" },
  { label: "Financeiro", icon: Banknote, to: "/financeiro" },
  { label: "Integrações", icon: Plug, to: "/integracoes" },
  { label: "Configurações", icon: Cog, to: "/config" },
  { label: "Suporte pelo WhatsApp", icon: LifeBuoy, external: SUPPORT_WHATSAPP_URL },
  { label: "Ajuda", icon: HelpCircle, external: HELP_CENTER_URL },
];

export function Sidebar() {
  const [isHovered, setIsHovered] = useState(false);
  const isCollapsed = !isHovered;

  return (
    <motion.aside
      initial={false}
      animate={{
        width: isHovered ? 248 : 64,
      }}
      transition={{
        duration: 0.3,
        ease: "easeInOut",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="flex h-screen shrink-0 flex-col border-r border-border/60 bg-background text-foreground"
    >
      {/* Brand / Logo */}
      <div
        className={clsx(
          "flex items-center border-b border-border/60 py-2",
          isCollapsed ? "justify-center px-2" : "justify-between px-4"
        )}
        style={{ height: BRAND_H }}
      >
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, delay: 0.1 }}
            className="text-xl font-bold tracking-tight overflow-hidden text-foreground"
          >
            RiseCheckout
          </motion.div>
        )}
      </div>

      {/* Navegação */}
      <TooltipProvider delayDuration={300}>
        <nav
          className={clsx(
            "scrollbar-none flex-1 overflow-y-auto transition-all duration-300 ease-in-out",
            isCollapsed ? "px-2 py-6" : "px-3 py-4"
          )}
        >
          <ul className={clsx(
            "flex flex-col h-full",
            isCollapsed ? "space-y-3 justify-start" : "space-y-1"
          )}>
            {navItems.map((it) => {
              const Icon = it.icon;
              const content = it.external ? (
                <a
                  href={it.external}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={rowClass(undefined, isCollapsed)}
                >
                  <Icon className="h-5 w-5 shrink-0 transition-transform group-hover:scale-110" />
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: 0.1 }}
                      className="font-medium text-sm whitespace-nowrap overflow-hidden"
                    >
                      {it.label}
                    </motion.span>
                  )}
                </a>
              ) : (
                <NavLink
                  to={it.to!}
                  className={({ isActive }) => rowClass(isActive, isCollapsed)}
                >
                  <Icon className="h-5 w-5 shrink-0 transition-transform group-hover:scale-110" />
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: 0.1 }}
                      className="font-medium text-sm whitespace-nowrap overflow-hidden"
                    >
                      {it.label}
                    </motion.span>
                  )}
                </NavLink>
              );

              if (isCollapsed) {
                return (
                  <li key={it.label}>
                    <Tooltip>
                      <TooltipTrigger asChild>{content}</TooltipTrigger>
                      <TooltipContent side="right">{it.label}</TooltipContent>
                    </Tooltip>
                  </li>
                );
              }

              return <li key={it.label}>{content}</li>;
            })}
          </ul>
        </nav>
      </TooltipProvider>

      {/* Rodapé com email + sair */}
      <UserFooter isCollapsed={isCollapsed} />
    </motion.aside>
  );
}

function rowClass(active?: boolean, collapsed?: boolean) {
  return clsx(
    "group flex items-center rounded-md text-sm transition-all duration-200",
    // Padding vertical maior quando fechado para distribuir ícones
    collapsed ? "py-4" : "py-2.5",
    // Padding horizontal e gap apenas quando aberto
    collapsed ? "justify-center px-0" : "gap-3 px-3",
    // Estados de ativo/hover
    active
      ? "bg-muted text-foreground font-semibold shadow-sm"
      : "text-foreground/80 hover:bg-muted/50 hover:text-foreground hover:scale-[1.02]"
  );
}
