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
import { useState } from "react";

type Item = { label: string; icon: React.ElementType; to?: string; external?: string };

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

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group/sidebar flex h-screen shrink-0 flex-col border-r border-border/60 bg-background text-foreground transition-all duration-300 ease-in-out"
      style={{
        width: isHovered ? '248px' : '64px',
      }}
    >
      {/* Brand / Logo */}
      <div
        className="flex items-center border-b border-border/60 py-2 px-4"
        style={{ height: 88 }}
      >
        {isHovered && (
          <div className="text-xl font-bold tracking-tight text-foreground transition-opacity duration-200">
            RiseCheckout
          </div>
        )}
      </div>

      {/* Navegação */}
      <TooltipProvider delayDuration={300}>
        <nav className="flex-1 overflow-y-auto px-2 py-6">
          <ul className="flex flex-col gap-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              
              const linkContent = (
                <div className="group/item flex items-center gap-3 rounded-md px-2 py-2.5 text-sm transition-all duration-200 hover:bg-muted/50 hover:text-foreground hover:scale-[1.02]">
                  <Icon className="h-5 w-5 shrink-0 transition-transform group-hover/item:scale-110" />
                  {isHovered && (
                    <span className="font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                      {item.label}
                    </span>
                  )}
                </div>
              );

              const content = item.external ? (
                <a
                  href={item.external}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {linkContent}
                </a>
              ) : (
                <NavLink to={item.to!}>
                  {({ isActive }) => (
                    <div className={isActive && isHovered ? "group/item flex items-center gap-3 rounded-md px-2 py-2.5 text-sm bg-muted text-foreground font-semibold shadow-sm" : ""}>
                      {isActive && isHovered ? (
                        <>
                          <Icon className="h-5 w-5 shrink-0 transition-transform group-hover/item:scale-110" />
                          {isHovered && (
                            <span className="font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                              {item.label}
                            </span>
                          )}
                        </>
                      ) : (
                        linkContent
                      )}
                    </div>
                  )}
                </NavLink>
              );

              if (!isHovered) {
                return (
                  <li key={item.label}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {content}
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  </li>
                );
              }

              return <li key={item.label}>{content}</li>;
            })}
          </ul>
        </nav>
      </TooltipProvider>

      {/* Rodapé com email + sair */}
      <UserFooter isCollapsed={!isHovered} />
    </aside>
  );
}
