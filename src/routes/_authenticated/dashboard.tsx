import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShoppingCart, Store, ChevronRight, AlertTriangle, Clock, Sparkle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BadgeTransaksi } from "@/components/StatusBadges";
import { formatRupiah } from "@/lib/format";
import { useTransaksi } from "@/lib/transaksi";
import { useRingkasan } from "@/lib/ringkasan";
import { useUserRole } from "@/hooks/useUserRole";


export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard Mandor | Bandar Ikan" },
      {
        name: "description",
        content:
          "Ringkasan harian bandar ikan: laba, kas tunai, hutang petani, piutang pelanggan, dan aktivitas terbaru.",
      },
      { property: "og:title", content: "Dashboard Bandar Ikan" },
      { property: "og:description", content: "Ringkasan laba, kas, hutang, dan piutang harian." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function Ringkas({
  label,
  nilai,
  aksen,
  nilaiCls,
}: {
  label: string;
  nilai: string;
  aksen: string;
  nilaiCls?: string;
}) {
  return (
    <div className={`surface-card relative overflow-hidden rounded-xl p-3.5`}>
      <span className={`absolute inset-y-0 left-0 w-[3px] ${aksen}`} aria-hidden />
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-xl font-semibold tracking-tight ${nilaiCls ?? "text-foreground"}`}>
        {nilai}
      </p>
    </div>
  );
}

function Dashboard() {
  const { isOwner } = useUserRole();
  const { data: rows = [], isLoading } = useTransaksi();
  const { data: ringkasan, isLoading: loadingRingkas } = useRingkasan();

  const { data: profil } = useQuery({
    queryKey: ["profil-saya"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("nama")
        .eq("id", u.user.id)
        .maybeSingle();
      return data;
    },
  });

  const laba = ringkasan?.laba_hari_ini ?? 0;
  const saldoKas = ringkasan?.saldo_kas ?? 0;
  const hutang = ringkasan?.hutang ?? 0;
  const piutang = ringkasan?.piutang ?? 0;
  const jmlMenunggu = ringkasan?.jml_menunggu ?? 0;
  const jmlBelumLunas = ringkasan?.jml_belum_lunas ?? 0;


  const tanggal = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <AppShell title="Dashboard">
      <div className="mx-auto w-full max-w-[900px] space-y-4 px-4 py-4">
        <div>
          <h2 className="text-base font-medium text-foreground">
            Selamat datang, {profil?.nama ?? (isOwner ? "Owner" : "Mandor")}
          </h2>
          <p className="text-sm text-muted-foreground">{tanggal}</p>
        </div>

        {loadingRingkas ? (
          <div className="grid grid-cols-2 gap-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[72px] w-full" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            <Ringkas
              label="Laba hari ini"
              nilai={formatRupiah(laba)}
              aksen="bg-success"
              nilaiCls={laba < 0 ? "text-destructive" : "text-success"}
            />
            <Ringkas label="Kas tunai" nilai={formatRupiah(saldoKas)} aksen="bg-primary" />
            <Ringkas label="Hutang" nilai={formatRupiah(hutang)} aksen="bg-hutang" />
            <Ringkas label="Piutang" nilai={formatRupiah(piutang)} aksen="bg-warning" />
          </div>
        )}

        {(jmlMenunggu > 0 || jmlBelumLunas > 0) && (
          <div className="space-y-1 rounded-xl border border-warning/25 bg-warning/10 px-3 py-2.5">
            {jmlBelumLunas > 0 && (
              <p className="flex items-center gap-1.5 text-sm text-warning">
                <AlertTriangle className="h-4 w-4" />
                {jmlBelumLunas} transaksi belum lunas
              </p>
            )}
            {jmlMenunggu > 0 && (
              <p className="flex items-center gap-1.5 text-sm text-warning">
                <Clock className="h-4 w-4" />
                {jmlMenunggu} transaksi menunggu persetujuan
              </p>
            )}
          </div>
        )}


        <div className="grid grid-cols-3 gap-2">
          <Button asChild variant="outline" className="h-11">
            <Link to="/pembelian/baru">Pembelian</Link>
          </Button>
          <Button asChild variant="outline" className="h-11">
            <Link to="/penjualan/baru">Penjualan</Link>
          </Button>
          <Button asChild className="h-11">
            <Link to="/ai">
              <Sparkle className="mr-1.5 h-4 w-4" /> Tanya AI
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
            <Card className="surface-card rounded-xl p-6 text-center text-sm text-muted-foreground">
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
                    <Card className="surface-card grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl p-3 transition-colors hover:bg-accent/40">
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
                          <div className="text-xs text-muted-foreground">
                            {formatRupiah(r.total)}
                          </div>
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
