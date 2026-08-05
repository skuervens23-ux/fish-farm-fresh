import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ShoppingCart,
  Store,
  History,
  FileEdit,
  CheckSquare,
  Users,
  Contact,
  LogOut,
  Fish,
  Wallet,
  BarChart3,
  UserCog,
  Settings,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
import { useUserRole } from "@/hooks/useUserRole";

type Item = { title: string; url: string; icon: typeof Fish; ownerOnly?: boolean };

const UTAMA: Item[] = [{ title: "Dashboard", url: "/dashboard", icon: LayoutDashboard }];

const TRANSAKSI: Item[] = [
  { title: "Input Pembelian", url: "/pembelian/baru", icon: ShoppingCart },
  { title: "Input Penjualan", url: "/penjualan/baru", icon: Store },
  { title: "Kas Masuk & Keluar", url: "/kas", icon: Wallet },
];

const DATA: Item[] = [
  { title: "Riwayat Transaksi", url: "/riwayat", icon: History },
  { title: "Draft", url: "/draft", icon: FileEdit },
  { title: "Persetujuan", url: "/persetujuan", icon: CheckSquare, ownerOnly: true },
  
  { title: "Laporan & Grafik", url: "/laporan", icon: BarChart3 },
];

const MASTER: Item[] = [
  { title: "Data Petani", url: "/petani", icon: Users, ownerOnly: true },
  { title: "Data Pelanggan", url: "/pelanggan", icon: Contact, ownerOnly: true },
  { title: "Pengguna & Hak Akses", url: "/pengguna", icon: UserCog, ownerOnly: true },
  { title: "Pengaturan", url: "/pengaturan", icon: Settings },
];


export function AppSidebar() {
  const { isOwner } = useUserRole();
  const { setOpenMobile } = useSidebar();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  const visible = (items: Item[]) => items.filter((i) => !i.ownerOnly || isOwner);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  function renderGroup(label: string, items: Item[]) {
    const list = visible(items);
    if (list.length === 0) return null;
    return (
      <SidebarGroup>
        <SidebarGroupLabel>{label}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {list.map((item) => (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton asChild isActive={pathname.startsWith(item.url)}>
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
            <div className="truncate text-[11px] text-muted-foreground">
              Sistem Manajemen Perikanan
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {renderGroup("Menu", UTAMA)}
        {renderGroup("Input Transaksi", TRANSAKSI)}
        {renderGroup("Data", DATA)}
        {renderGroup("Master", MASTER)}
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center justify-between gap-2 px-2 pb-2">
          <Badge
            variant="secondary"
            className={isOwner ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}
          >
            {isOwner ? "Owner" : "Mandor"}
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
