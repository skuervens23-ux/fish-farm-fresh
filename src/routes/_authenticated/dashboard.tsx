import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ShoppingCart,
  Store,
  Clock,
  XCircle,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BadgeTransaksi } from "@/components/StatusBadges";
import { formatRupiah } from "@/lib/format";
import { useTransaksi } from "@/lib/transaksi";
import { useUserRole } from "@/hooks/useUserRole";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard Mandor | Bandar Ikan" },
      {
        name: "description",
        content:
          "Ringkasan aktivitas harian bandar ikan: pembelian, penjualan, transaksi menunggu persetujuan, dan aktivitas terbaru.",
      },
      { property: "og:title", content: "Dashboard Bandar Ikan" },
      { property: "og:description", content: "Ringkasan aktivitas harian pembelian dan penjualan ikan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { isOwner } = useUserRole();
  const { data: rows = [], isLoading } = useTransaksi();

  const { data: profil } = useQuery({
    queryKey: ["profil-saya"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("profiles").select("nama").eq("id", u.user.id).maybeSingle();
      return data;
    },
  });

  const today = new Date().toISOString().slice(0, 10);
  const hariIni = rows.filter((r) => r.tanggal === today);
  const beli = hariIni.filter((r) => r.jenis === "pembelian");
  const jual = hariIni.filter((r) => r.jenis === "penjualan");
  const menunggu = rows.filter((r) => r.status_transaksi === "menunggu");
  const ditolak = rows.filter((r) => r.status_transaksi === "ditolak");
  const disetujui = rows.filter((r) => r.status_transaksi === "disetujui");

  const sum = (list: typeof rows) => list.reduce((s, r) => s + r.total, 0);

  const kartu = [
    {
      label: "Pembelian Hari Ini",
      icon: ShoppingCart,
      count: beli.length,
      total: sum(beli),
      cls: "bg-primary/15 text-primary",
    },
    {
      label: "Penjualan Hari Ini",
      icon: Store,
      count: jual.length,
      total: sum(jual),
      cls: "bg-success/15 text-success",
    },
    {
      label: "Menunggu Persetujuan",
      icon: Clock,
      count: menunggu.length,
      total: sum(menunggu),
      cls: "bg-warning/15 text-warning",
    },
    {
      label: "Ditolak",
      icon: XCircle,
      count: ditolak.length,
      total: sum(ditolak),
      cls: "bg-destructive/15 text-destructive",
    },
    {
      label: "Disetujui",
      icon: CheckCircle2,
      count: disetujui.length,
      total: sum(disetujui),
      cls: "bg-success/15 text-success",
    },
  ];

  return (
    <AppShell title="Dashboard">
      <div className="mx-auto w-full max-w-[900px] space-y-5 px-4 py-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Selamat datang, {profil?.nama ?? (isOwner ? "Owner" : "Mandor")}
          </h2>
          <p className="text-sm text-muted-foreground">Berikut ringkasan aktivitas Anda hari ini.</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)
            : kartu.map((k) => (
                <Card key={k.label} className="p-4">
                  <div className={`mb-2 grid h-9 w-9 place-items-center rounded-full ${k.cls}`}>
                    <k.icon className="h-4 w-4" />
                  </div>
                  <div className="text-xs text-muted-foreground">{k.label}</div>
                  <div className="text-2xl font-bold text-foreground">{k.count}</div>
                  <div className="text-xs text-muted-foreground">{formatRupiah(k.total)}</div>
                </Card>
              ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button asChild className="h-12">
            <Link to="/pembelian/baru">
              <ShoppingCart className="mr-2 h-4 w-4" /> Input Pembelian
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-12">
            <Link to="/penjualan/baru">
              <Store className="mr-2 h-4 w-4" /> Input Penjualan
            </Link>
          </Button>
        </div>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Aktivitas Terbaru</h3>
            <Link to="/riwayat" className="text-xs font-medium text-primary hover:underline">
              Lihat Semua
            </Link>
          </div>
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : rows.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              Belum ada transaksi. Mulai dari Input Pembelian.
            </Card>
          ) : (
            <ul className="space-y-2">
              {rows.slice(0, 6).map((r) => (
                <li key={`${r.jenis}-${r.id}`}>
                  <Link
                    to={r.jenis === "pembelian" ? "/pembelian/$id" : "/penjualan/$id"}
                    params={{ id: r.id }}
                  >
                    <Card className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-3 transition-colors hover:bg-accent/50">
                      <div
                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                          r.jenis === "pembelian"
                            ? "bg-primary/15 text-primary"
                            : "bg-success/15 text-success"
                        }`}
                      >
                        {r.jenis === "pembelian" ? (
                          <ShoppingCart className="h-4 w-4" />
                        ) : (
                          <Store className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-foreground">
                          {r.jenis === "pembelian" ? "Pembelian" : "Penjualan"} {r.jenis_ikan}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">{r.pihak}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <BadgeTransaksi status={r.status_transaksi} />
                          <div className="text-xs text-muted-foreground">{formatRupiah(r.total)}</div>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </div>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
