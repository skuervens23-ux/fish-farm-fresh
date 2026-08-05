import { createFileRoute } from "@tanstack/react-router";
import { Boxes } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatKg, formatRupiah } from "@/lib/format";
import { useStokIkan } from "@/lib/analitik";

export const Route = createFileRoute("/_authenticated/stok")({
  head: () => ({
    meta: [
      { title: "Stok Ikan | ERP Bandar Ikan" },
      {
        name: "description",
        content:
          "Stok ikan berjalan per jenis: berat masuk dari pembelian, berat keluar dari penjualan, sisa stok, dan nilai persediaan.",
      },
      { property: "og:title", content: "Stok Ikan — ERP Bandar Ikan" },
      {
        property: "og:description",
        content: "Pembelian menambah stok, penjualan mengurangi stok, otomatis dan real-time.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StokPage,
});

function StokPage() {
  const { data: rows = [], isLoading } = useStokIkan();

  const totalSisa = rows.reduce((a, r) => a + r.kg_sisa, 0);
  const totalNilai = rows.reduce((a, r) => a + r.nilai_persediaan, 0);

  return (
    <AppShell title="Stok Ikan">
      <div className="mx-auto w-full max-w-[900px] space-y-3 px-4 py-4">
        <div className="grid grid-cols-2 gap-2.5">
          <Card className="surface-card rounded-xl p-3.5">
            <p className="text-xs text-muted-foreground">Total Sisa Stok</p>
            <p className="text-xl font-semibold text-foreground">{formatKg(totalSisa)}</p>
          </Card>
          <Card className="surface-card rounded-xl p-3.5">
            <p className="text-xs text-muted-foreground">Nilai Persediaan</p>
            <p className="text-xl font-semibold text-primary">{formatRupiah(totalNilai)}</p>
          </Card>
        </div>

        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : rows.length === 0 ? (
          <Card className="surface-card rounded-xl p-6 text-center text-sm text-muted-foreground">
            Belum ada stok. Catat pembelian untuk menambah stok.
          </Card>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.jenis_ikan}>
                <Card className="surface-card rounded-xl p-3.5">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/12 text-primary">
                      <Boxes className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {r.jenis_ikan}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Masuk {formatKg(r.kg_masuk)} • Keluar {formatKg(r.kg_keluar)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-foreground">
                        {formatKg(r.kg_sisa)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatRupiah(r.nilai_persediaan)}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Harga rata-rata modal {formatRupiah(r.harga_rata)}/kg
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
