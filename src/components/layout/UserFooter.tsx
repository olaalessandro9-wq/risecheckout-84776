// src/components/layout/UserFooter.tsx
import { LogOut } from "lucide-react";
import { signOut, supabase } from "@/lib/auth";
import { useEffect, useState } from "react";
import clsx from "clsx";

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
      <button
        type="button"
        onClick={signOut}
        className={clsx(
          "flex w-full items-center rounded-md bg-destructive/90 px-3 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive transition",
          isCollapsed ? "justify-center" : "justify-center gap-2"
        )}
        title={isCollapsed ? "Sair" : undefined}
      >
        <LogOut className="h-4 w-4" />
        {!isCollapsed && "Sair"}
      </button>
    </div>
  );
}
