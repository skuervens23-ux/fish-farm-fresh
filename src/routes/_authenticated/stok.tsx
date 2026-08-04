import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Fish } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatKg, formatRupiah } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/stok")({
  head: () => ({
    meta: [
      { title: "Stok Ikan | Bandar Ikan" },
      {
        name: "description",
        content:
          "Pantau stok ikan berjalan per jenis: total masuk dari pembelian disetujui dikurangi penjualan disetujui.",
      },
      { property: "og:title", content: "Stok Ikan" },
      { property: "og:description", content: "Stok berjalan per jenis ikan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StokPage,
});

type BarisStok = {
  jenis: string;
  masuk: number;
  keluar: number;
  sisa: number;
  nilaiBeli: number;
  nilaiJual: number;
};

function useStok() {
  return useQuery({
    queryKey: ["stok"],
    queryFn: async (): Promise<BarisStok[]> => {
      const [beli, jual] = await Promise.all([
        supabase
          .from("pembelian")
          .select("jenis_ikan, jumlah_kg, total_harga, status_transaksi")
          .eq("status_transaksi", "disetujui"),
        supabase
          .from("penjualan")
          .select("jenis_ikan, berat_kg, total_harga, status_transaksi")
          .eq("status_transaksi", "disetujui"),
      ]);
      if (beli.error) throw beli.error;
      if (jual.error) throw jual.error;

      const map = new Map<string, BarisStok>();
      const get = (jenis: string) => {
        let row = map.get(jenis);
        if (!row) {
          row = { jenis, masuk: 0, keluar: 0, sisa: 0, nilaiBeli: 0, nilaiJual: 0 };
          map.set(jenis, row);
        }
        return row;
      };
      for (const p of beli.data ?? []) {
        const r = get(p.jenis_ikan);
        r.masuk += Number(p.jumlah_kg ?? 0);
        r.nilaiBeli += Number(p.total_harga ?? 0);
      }
      for (const p of jual.data ?? []) {
        const r = get(p.jenis_ikan);
        r.keluar += Number(p.berat_kg ?? 0);
        r.nilaiJual += Number(p.total_harga ?? 0);
      }
      const rows = Array.from(map.values());
      for (const r of rows) r.sisa = +(r.masuk - r.keluar).toFixed(2);
      return rows.sort((a, b) => b.sisa - a.sisa);
    },
  });
}

function StokPage() {
  const { data: rows = [], isLoading } = useStok();

  const total = useMemo(
    () => ({
      masuk: rows.reduce((s, r) => s + r.masuk, 0),
      keluar: rows.reduce((s, r) => s + r.keluar, 0),
      sisa: rows.reduce((s, r) => s + r.sisa, 0),
    }),
    [rows],
  );

  return (
    <AppShell title="Stok Ikan">
      <div className="mx-auto w-full max-w-[900px] space-y-4 px-4 py-4">
        <p className="text-sm text-muted-foreground">
          Stok dihitung dari transaksi berstatus <strong>disetujui</strong>: pembelian masuk
          dikurangi penjualan keluar.
        </p>

        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3">
            <div className="text-[11px] text-muted-foreground">Masuk</div>
            <div className="text-sm font-bold text-success">{formatKg(total.masuk)}</div>
          </Card>
          <Card className="p-3">
            <div className="text-[11px] text-muted-foreground">Keluar</div>
            <div className="text-sm font-bold text-warning">{formatKg(total.keluar)}</div>
          </Card>
          <Card className="p-3">
            <div className="text-[11px] text-muted-foreground">Sisa Stok</div>
            <div className="text-sm font-bold text-primary">{formatKg(total.sisa)}</div>
          </Card>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            Belum ada transaksi disetujui.
          </Card>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <Card key={r.jenis} className="p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                      <Fish className="h-4 w-4" />
                    </div>
                    <div className="truncate text-sm font-semibold">{r.jenis}</div>
                  </div>
                  <div
                    className={`text-sm font-bold ${r.sisa < 0 ? "text-destructive" : "text-primary"}`}
                  >
                    {formatKg(r.sisa)}
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground sm:grid-cols-4">
                  <div>Masuk: {formatKg(r.masuk)}</div>
                  <div>Keluar: {formatKg(r.keluar)}</div>
                  <div>Beli: {formatRupiah(r.nilaiBeli)}</div>
                  <div>Jual: {formatRupiah(r.nilaiJual)}</div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
