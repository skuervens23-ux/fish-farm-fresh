import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, ShoppingCart, Store, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BadgeTransaksi, BadgeBayar } from "@/components/StatusBadges";
import { formatRupiah, formatTanggal } from "@/lib/format";
import { useTransaksi, type Transaksi } from "@/lib/transaksi";
import type { StatusBayar } from "@/lib/status";

export const Route = createFileRoute("/_authenticated/riwayat")({
  head: () => ({
    meta: [
      { title: "Riwayat Transaksi | Bandar Ikan" },
      {
        name: "description",
        content:
          "Lihat semua riwayat pembelian dan penjualan ikan beserta status persetujuan dan pembayaran.",
      },
      { property: "og:title", content: "Riwayat Transaksi Bandar Ikan" },
      { property: "og:description", content: "Riwayat lengkap pembelian dan penjualan ikan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RiwayatPage,
});

const STATUS: Array<{ value: "semua" | StatusBayar; label: string }> = [
  { value: "semua", label: "Semua" },
  { value: "lunas", label: "Lunas" },
  { value: "sebagian", label: "Sebagian" },
  { value: "belum", label: "Belum Bayar" },
];

export function DaftarTransaksi({
  rows,
  isLoading,
  kosong,
}: {
  rows: Transaksi[];
  isLoading: boolean;
  kosong: string;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }
  if (rows.length === 0) {
    return <Card className="p-6 text-center text-sm text-muted-foreground">{kosong}</Card>;
  }
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
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
                <div className="truncate text-xs text-muted-foreground">
                  {r.pihak} · {formatTanggal(r.tanggal)}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  <BadgeTransaksi status={r.status_transaksi} />
                  <BadgeBayar status={r.status_bayar} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {formatRupiah(r.total)}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function RiwayatPage() {
  const { data: rows = [], isLoading } = useTransaksi();
  const [tab, setTab] = useState<"semua" | "pembelian" | "penjualan">("semua");
  const [status, setStatus] = useState<"semua" | StatusBayar>("semua");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const key = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (tab !== "semua" && r.jenis !== tab) return false;
      if (status !== "semua" && r.status_bayar !== status) return false;
      if (!key) return true;
      return r.pihak.toLowerCase().includes(key) || r.jenis_ikan.toLowerCase().includes(key);
    });
  }, [rows, tab, status, q]);

  return (
    <AppShell title="Riwayat Transaksi">
      <div className="mx-auto w-full max-w-[900px] space-y-4 px-4 py-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="w-full">
            <TabsTrigger value="semua" className="flex-1">
              Semua
            </TabsTrigger>
            <TabsTrigger value="pembelian" className="flex-1">
              Pembelian
            </TabsTrigger>
            <TabsTrigger value="penjualan" className="flex-1">
              Penjualan
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari petani, pelanggan, atau jenis ikan…"
            className="h-11 pl-9"
            aria-label="Cari transaksi"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUS.map((s) => (
            <Button
              key={s.value}
              type="button"
              size="sm"
              variant={status === s.value ? "default" : "outline"}
              onClick={() => setStatus(s.value)}
            >
              {s.label}
            </Button>
          ))}
        </div>

        <DaftarTransaksi rows={filtered} isLoading={isLoading} kosong="Tidak ada transaksi." />
      </div>
    </AppShell>
  );
}
