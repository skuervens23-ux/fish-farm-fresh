import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Boxes } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRupiah } from "@/lib/format";
import { rentang, useProfitLot } from "@/lib/analitik";

export const Route = createFileRoute("/_authenticated/lot")({
  head: () => ({
    meta: [
      { title: "Fish LOT | ERP Bandar Ikan" },
      {
        name: "description",
        content:
          "Rekap Fish LOT per tanggal: kg beli, kg jual, modal, penjualan, biaya, laba bersih, dan margin.",
      },
      { property: "og:title", content: "Fish LOT — ERP Bandar Ikan" },
      { property: "og:description", content: "Keuntungan setiap LOT ikan berdasarkan tanggal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LotPage,
});

const PRESET = [
  { id: "7h", label: "7 Hari" },
  { id: "30h", label: "30 Hari" },
  { id: "bulan-ini", label: "Bulan Ini" },
  { id: "tahun-ini", label: "Tahun Ini" },
] as const;

function LotPage() {
  const [preset, setPreset] = useState<(typeof PRESET)[number]["id"]>("30h");
  const { data: rows = [], isLoading } = useProfitLot(rentang(preset));

  return (
    <AppShell title="Fish LOT">
      <div className="mx-auto w-full max-w-[900px] space-y-3 px-4 py-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {PRESET.map((p) => (
            <Button
              key={p.id}
              size="sm"
              variant={preset === p.id ? "default" : "outline"}
              onClick={() => setPreset(p.id)}
            >
              {p.label}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : rows.length === 0 ? (
          <Card className="surface-card rounded-xl p-6 text-center text-sm text-muted-foreground">
            Belum ada LOT pada periode ini.
          </Card>
        ) : (
          <ul className="space-y-2">
            {rows.map((l) => (
              <li key={l.lot}>
                <Card className="surface-card rounded-xl p-3.5">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/12 text-primary">
                      <Boxes className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground">
                        LOT{" "}
                        {new Date(l.lot).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {l.kg_beli.toLocaleString("id-ID")} kg beli •{" "}
                        {l.kg_jual.toLocaleString("id-ID")} kg jual
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div
                        className={`text-sm font-semibold ${l.laba_bersih < 0 ? "text-destructive" : "text-success"}`}
                      >
                        {formatRupiah(l.laba_bersih)}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        margin {l.margin.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-lg bg-muted/40 p-2">
                      <p className="text-muted-foreground">Modal</p>
                      <p className="font-medium text-foreground">{formatRupiah(l.modal)}</p>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-2">
                      <p className="text-muted-foreground">Penjualan</p>
                      <p className="font-medium text-foreground">{formatRupiah(l.penjualan)}</p>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-2">
                      <p className="text-muted-foreground">Biaya</p>
                      <p className="font-medium text-foreground">{formatRupiah(l.biaya)}</p>
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
