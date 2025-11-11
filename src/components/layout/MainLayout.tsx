import { ReactNode, useContext } from "react";
import { Sidebar } from "./Sidebar";
import { ThemeCtx } from "@/providers/theme";
import { Sun, Moon, Bell, User } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { theme, toggle: toggleTheme } = useContext(ThemeCtx);

  return (
    <div className="min-h-screen flex w-full bg-bg fixed inset-0">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-sidebar-border flex items-center justify-between px-8 bg-card/30 backdrop-blur-xl sticky top-0 z-10 flex-shrink-0">
          <div className="flex-1"></div>
          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-xl hover:bg-sidebar-hover transition-all duration-200"
              title={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
            >
              {theme === "light" ? (
                <Moon className="w-5 h-5 text-subtext" />
              ) : (
                <Sun className="w-5 h-5 text-subtext" />
              )}
            </Button>
            <button className="p-2.5 rounded-xl hover:bg-sidebar-hover transition-all duration-200 hover:scale-105 group">
              <Bell className="w-5 h-5 text-subtext group-hover:text-text transition-colors" />
            </button>
            <button className="p-2.5 rounded-xl hover:bg-sidebar-hover transition-all duration-200 hover:scale-105 group">
              <User className="w-5 h-5 text-subtext group-hover:text-text transition-colors" />
            </button>
          </div>
        </header>
        <main className="flex-1 p-8 bg-bg overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

