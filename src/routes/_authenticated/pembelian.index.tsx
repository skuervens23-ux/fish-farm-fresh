import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, LogOut, Users, Search, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatKg, formatRupiah, formatTanggal } from "@/lib/format";
import { useUserRole } from "@/hooks/useUserRole";
import { unduhLaporanMingguan } from "@/lib/laporan";
import { toast } from "sonner";

type Pembelian = {
  id: string;
  tanggal: string;
  jenis_ikan: string;
  jumlah_kg: number | string;
  harga_per_kg: number | string;
  total_harga: number | string;
  jumlah_dibayar: number | string;
  status_bayar: "lunas" | "belum" | "sebagian";
  petani: { nama: string } | null;
};

const FILTER_STATUS = [
  { value: "semua", label: "Semua" },
  { value: "belum", label: "Belum" },
  { value: "sebagian", label: "Sebagian" },
  { value: "lunas", label: "Lunas" },
] as const;

export const Route = createFileRoute("/_authenticated/pembelian/")({
  component: PembelianList,
});

function PembelianList() {
  const navigate = useNavigate();
  const { role, isOwner } = useUserRole();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<(typeof FILTER_STATUS)[number]["value"]>("semua");

  const { data: semua = [], isLoading } = useQuery({
    queryKey: ["pembelian"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pembelian")
        .select("id, tanggal, jenis_ikan, jumlah_kg, harga_per_kg, total_harga, status_bayar, jumlah_dibayar, petani:petani_id(nama)")
        .order("tanggal", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as unknown as Pembelian[];
    },
  });

  const data = useMemo(() => {
    const key = q.trim().toLowerCase();
    return semua.filter((p) => {
      if (status !== "semua" && p.status_bayar !== status) return false;
      if (!key) return true;
      return (
        (p.petani?.nama ?? "").toLowerCase().includes(key) ||
        p.jenis_ikan.toLowerCase().includes(key)
      );
    });
  }, [semua, q, status]);

  const today = new Date().toISOString().slice(0, 10);
  const totalHariIni = data
    .filter((p) => p.tanggal === today)
    .reduce((s, p) => s + Number(p.total_harga), 0);
  const totalHutang = data.reduce(
    (s, p) => s + Math.max(0, Number(p.total_harga) - Number(p.jumlah_dibayar)),
    0,
  );

  const grupHarian = useMemo(() => groupBy(data, (p) => p.tanggal), [data]);
  const grupMingguan = useMemo(() => groupBy(data, (p) => weekKey(p.tanggal)), [data]);

  function exportExcel() {
    if (data.length === 0) return toast.error("Tidak ada data untuk diekspor");
    unduhLaporanMingguan(
      data.map((p) => ({
        tanggal: p.tanggal,
        petani: p.petani?.nama ?? "—",
        jenis_ikan: p.jenis_ikan,
        jumlah_kg: Number(p.jumlah_kg),
        harga_per_kg: Number(p.harga_per_kg),
        total_harga: Number(p.total_harga),
        jumlah_dibayar: Number(p.jumlah_dibayar),
        status_bayar: p.status_bayar,
      })),
    );
    toast.success("Laporan mingguan diunduh");
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }


  return (
    <main className="min-h-screen bg-muted/40 pb-24">
      <header className="sticky top-0 z-10 border-b border-border bg-background">
        <div className="mx-auto flex max-w-[420px] items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-foreground">Pembelian</h1>
            {role && (
              <Badge
                variant="secondary"
                className={
                  isOwner
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground"
                }
              >
                {isOwner ? "Owner" : "Mandor"}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {isOwner && (

              <Button variant="ghost" size="icon" asChild aria-label="Kelola Petani">
                <Link to="/petani">
                  <Users className="h-4 w-4" />
                </Link>
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={signOut} aria-label="Keluar">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[420px] px-4 pt-4">
        {isOwner && (
          <Card className="mb-4 grid grid-cols-2 gap-3 p-4">
            <div>
              <div className="text-xs text-muted-foreground">Total hari ini</div>
              <div className="text-base font-semibold text-primary">
                {formatRupiah(totalHariIni)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Total hutang</div>
              <div className="text-base font-semibold text-hutang">
                {formatRupiah(totalHutang)}
              </div>
            </div>
          </Card>
        )}

        <div className="mb-3 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari petani atau jenis ikan…"
              className="h-11 pl-9"
              aria-label="Cari transaksi"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {FILTER_STATUS.map((f) => (
              <Button
                key={f.value}
                type="button"
                size="sm"
                variant={status === f.value ? "default" : "outline"}
                className="shrink-0 rounded-full"
                onClick={() => setStatus(f.value)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>

        {isOwner && (
          <Button variant="outline" className="mb-4 h-11 w-full" onClick={exportExcel}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Unduh Laporan Mingguan (Excel)
          </Button>
        )}

        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        )}
        {!isLoading && data.length === 0 && (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            {semua.length === 0
              ? "Belum ada pembelian. Tekan tombol di bawah untuk menambah."
              : "Tidak ada transaksi yang cocok dengan pencarian/filter."}
          </Card>
        )}


        {data.length > 0 && (
          <Tabs defaultValue="harian" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="harian">Harian</TabsTrigger>
              <TabsTrigger value="mingguan">Mingguan</TabsTrigger>
            </TabsList>

            <TabsContent value="harian" className="mt-4 space-y-5">
              {grupHarian.map(([key, items]) => (
                <GrupSection
                  key={key}
                  judul={formatTanggal(key)}
                  items={items}
                  showItemDate={false}
                />
              ))}
            </TabsContent>

            <TabsContent value="mingguan" className="mt-4 space-y-5">
              {grupMingguan.map(([key, items]) => (
                <GrupSection
                  key={key}
                  judul={labelMinggu(items)}
                  items={items}
                  showItemDate
                />
              ))}
            </TabsContent>
          </Tabs>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background p-4">
        <div className="mx-auto max-w-[420px]">
          <Button asChild className="h-12 w-full text-base">
            <Link to="/pembelian/baru">
              <Plus className="mr-2 h-4 w-4" />
              Pembelian Baru
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}

function GrupSection({
  judul,
  items,
  showItemDate,
}: {
  judul: string;
  items: Pembelian[];
  showItemDate: boolean;
}) {
  const total = items.reduce((s, p) => s + Number(p.total_harga), 0);
  const hutang = items.reduce(
    (s, p) => s + Math.max(0, Number(p.total_harga) - Number(p.jumlah_dibayar)),
    0,
  );
  const totalKg = items.reduce((s, p) => s + Number(p.jumlah_kg), 0);

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">{judul}</h2>
        <span className="text-xs text-muted-foreground">{items.length} transaksi</span>
      </div>
      <Card className="mb-3 grid grid-cols-3 gap-2 p-3 text-xs">
        <div>
          <div className="text-muted-foreground">Kg</div>
          <div className="font-medium text-foreground">{formatKg(totalKg)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Total</div>
          <div className="font-medium text-primary">{formatRupiah(total)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Hutang</div>
          <div className="font-medium text-hutang">{formatRupiah(hutang)}</div>
        </div>
      </Card>
      <ul className="space-y-3">
        {items.map((p) => {
          const sisa = Number(p.total_harga) - Number(p.jumlah_dibayar);
          return (
            <li key={p.id}>
              <Card className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-foreground">
                      {p.petani?.nama ?? "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {showItemDate ? `${formatTanggal(p.tanggal)} · ` : ""}
                      {p.jenis_ikan}
                    </div>
                  </div>
                  <StatusBadge status={p.status_bayar} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">Jumlah</div>
                    <div className="font-medium">{formatKg(Number(p.jumlah_kg))}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Total</div>
                    <div className="font-medium">{formatRupiah(Number(p.total_harga))}</div>
                  </div>
                </div>
                {sisa > 0 && (
                  <div className="mt-2 text-xs text-destructive">
                    Sisa hutang: {formatRupiah(sisa)}
                  </div>
                )}
              </Card>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function StatusBadge({ status }: { status: "lunas" | "belum" | "sebagian" }) {
  const map = {
    lunas: { label: "Lunas", cls: "bg-success/15 text-success" },
    belum: { label: "Belum bayar", cls: "bg-destructive/15 text-destructive" },
    sebagian: { label: "Sebagian", cls: "bg-warning/15 text-warning" },
  } as const;
  const s = map[status];
  return (
    <Badge variant="secondary" className={s.cls}>
      {s.label}
    </Badge>
  );
}

// ---------- helpers ----------

function groupBy<T>(arr: T[], keyFn: (t: T) => string): Array<[string, T[]]> {
  const map = new Map<string, T[]>();
  for (const item of arr) {
    const k = keyFn(item);
    const list = map.get(k);
    if (list) list.push(item);
    else map.set(k, [item]);
  }
  return Array.from(map.entries());
}

// Minggu = Senin sampai Minggu. Key = tanggal Senin (YYYY-MM-DD).
function weekKey(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay(); // 0=Min, 1=Sen, ... 6=Sab
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function labelMinggu(items: Pembelian[]): string {
  const tanggalList = items.map((p) => p.tanggal).sort();
  const mulai = tanggalList[0];
  const akhir = tanggalList[tanggalList.length - 1];
  if (mulai === akhir) return formatTanggal(mulai);
  return `${formatTanggal(mulai)} – ${formatTanggal(akhir)}`;
}
