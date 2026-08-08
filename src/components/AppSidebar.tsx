import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Contact,
  LogOut,
  Fish,
  Wallet,
  BarChart3,
  Settings,
  Sparkle,
  Receipt,
  Boxes,
  History,
  TrendingUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";

type Item = { title: string; url: string; icon: typeof Fish };

const UTAMA: Item[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Analisis Profit", url: "/analisis", icon: TrendingUp },
  { title: "Tanya AI", url: "/ai", icon: Sparkle },
];

const TRANSAKSI: Item[] = [
  { title: "Pembelian", url: "/pembelian", icon: ShoppingCart },
  { title: "Pengeluaran Operasional", url: "/biaya", icon: Receipt },
  { title: "Kas", url: "/kas", icon: Wallet },
];

const DATA: Item[] = [
  { title: "Fish LOT", url: "/lot", icon: Boxes },
  { title: "Riwayat", url: "/riwayat", icon: History },
  { title: "Laporan Harian", url: "/laporan-harian", icon: Receipt },
  { title: "Laporan", url: "/laporan", icon: BarChart3 },

];

const MASTER: Item[] = [
  { title: "Supplier", url: "/petani", icon: Users },
  { title: "Customer", url: "/pelanggan", icon: Contact },
  { title: "Jenis Ikan", url: "/jenis-ikan", icon: Fish },
  { title: "Pengaturan", url: "/pengaturan", icon: Settings },
];

export function AppSidebar() {
  const { setOpenMobile } = useSidebar();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  function renderGroup(label: string, items: Item[]) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>{label}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {items.map((item) => (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton asChild isActive={pathname === item.url || pathname.startsWith(`${item.url}/`)}>
                  <Link to={item.url} onClick={() => setOpenMobile(false)}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Fish className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-foreground">Bandar Ikan</div>
            <div className="truncate text-[11px] text-muted-foreground">ERP Owner</div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {renderGroup("Utama", UTAMA)}
        {renderGroup("Transaksi", TRANSAKSI)}
        {renderGroup("Data", DATA)}
        {renderGroup("Master", MASTER)}
      </SidebarContent>

      <SidebarFooter>
        <div className="px-2 pb-2">
          <Badge variant="secondary" className="bg-primary/15 text-primary">
            Owner
          </Badge>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut}>
              <LogOut className="h-4 w-4" />
              <span>Keluar</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
