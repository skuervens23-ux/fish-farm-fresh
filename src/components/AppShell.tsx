import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Moon, Sun } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { IndikatorOffline } from "@/components/IndikatorOffline";
import { useTema } from "@/lib/tema";


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
  const { tema, ganti } = useTema();

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
                <button
                  type="button"
                  onClick={ganti}
                  aria-label={tema === "dark" ? "Mode terang" : "Mode gelap"}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent"
                >
                  {tema === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
