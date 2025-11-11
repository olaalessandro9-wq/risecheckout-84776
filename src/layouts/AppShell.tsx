// src/layouts/AppShell.tsx
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { useScrollShadow } from "@/hooks/useScrollShadow";

export default function AppShell() {
  const { sentinelRef, scrolled } = useScrollShadow();

  const handleNotificationsClick = () => {
    // TODO: Implementar lógica de notificações
    console.log("Notificações clicadas");
  };

  return (
    <div className="flex h-screen w-full bg-background text-foreground">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <Topbar scrolled={scrolled} onNotificationsClick={handleNotificationsClick} />
        {/* Sentinel invisível para ativar a sombra ao rolar */}
        <div ref={sentinelRef} className="h-1 w-full" />
        <main className="relative mx-auto w-full max-w-[1400px] px-4 pb-8 pt-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
