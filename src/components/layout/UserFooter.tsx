// src/components/layout/UserFooter.tsx
import { LogOut, LifeBuoy, HelpCircle } from "lucide-react";
import { signOut, supabase } from "@/lib/auth";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HELP_CENTER_URL, SUPPORT_WHATSAPP_URL } from "@/lib/links";

interface UserFooterProps {
  isCollapsed: boolean;
}

export function UserFooter({ isCollapsed }: UserFooterProps) {
  const [email, setEmail] = useState<string | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? undefined);
    });
  }, []);

  const supportButtons = [
    { 
      label: "Suporte pelo WhatsApp", 
      icon: LifeBuoy, 
      url: SUPPORT_WHATSAPP_URL 
    },
    { 
      label: "Ajuda", 
      icon: HelpCircle, 
      url: HELP_CENTER_URL 
    },
  ];

  return (
    <div className="mt-auto border-t border-border/50 p-3">
      {!isCollapsed && email && (
        <div
          className="truncate text-xs text-muted-foreground mb-2"
          title={email}
        >
          {email}
        </div>
      )}

      {/* Botões de suporte - SOMENTE quando minimizado */}
      {isCollapsed && (
        <TooltipProvider delayDuration={300}>
          <div className="space-y-2 mb-2">
            {supportButtons.map((btn) => {
              const Icon = btn.icon;
              return (
                <Tooltip key={btn.label}>
                  <TooltipTrigger asChild>
                    <a
                      href={btn.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-center rounded-md text-sm font-medium transition bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground px-3 py-2.5"
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                    </a>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {btn.label}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
      )}

      {/* Botão Sair */}
      <button
        type="button"
        onClick={signOut}
        className={clsx(
          "flex w-full items-center rounded-md bg-destructive/90 text-sm font-medium text-destructive-foreground hover:bg-destructive transition",
          isCollapsed ? "justify-center px-3 py-2.5" : "justify-center gap-2 px-3 py-2"
        )}
        title={isCollapsed ? "Sair" : undefined}
      >
        <LogOut className={isCollapsed ? "h-5 w-5 shrink-0" : "h-4 w-4"} />
        {!isCollapsed && "Sair"}
      </button>
    </div>
  );
}
