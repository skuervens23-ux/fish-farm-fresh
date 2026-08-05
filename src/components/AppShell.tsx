import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Badge } from "@/components/ui/badge";
import { useUserRole } from "@/hooks/useUserRole";

function useJumlahMenunggu(enabled: boolean) {
  return useQuery({
    queryKey: ["menunggu-count"],
    enabled,
    queryFn: async () => {
      const [a, b] = await Promise.all([
        supabase
          .from("pembelian")
          .select("id", { count: "exact", head: true })
          .eq("status_transaksi", "menunggu"),
        supabase
          .from("penjualan")
          .select("id", { count: "exact", head: true })
          .eq("status_transaksi", "menunggu"),
      ]);
      return (a.count ?? 0) + (b.count ?? 0);
    },
  });
}

export function AppShell({
  title,
  backTo,
  actions,
  children,
}: {
  title: string;
  backTo?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { isOwner } = useUserRole();
  const { data: menunggu = 0 } = useJumlahMenunggu(isOwner);

  return (
    <SidebarProvider>
      <div className="bg-app flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-border/60 bg-background/70 backdrop-blur-xl">
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2.5">
              <div className="flex items-center gap-1">
                <SidebarTrigger aria-label="Buka menu" />
                {backTo && (
                  <Link
                    to={backTo}
                    aria-label="Kembali"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Link>
                )}
              </div>
              <h1 className="truncate text-base font-semibold text-foreground">{title}</h1>
              <div className="flex items-center gap-1">
                {actions}
                {isOwner && (
                  <Link
                    to="/persetujuan"
                    aria-label="Menunggu persetujuan"
                    className="relative inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent"
                  >
                    <Bell className="h-5 w-5" />
                    {menunggu > 0 && (
                      <Badge className="absolute -right-0.5 -top-0.5 h-4 min-w-4 justify-center rounded-full px-1 text-[10px]">
                        {menunggu}
                      </Badge>
                    )}
                  </Link>
                )}
              </div>
            </div>
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
