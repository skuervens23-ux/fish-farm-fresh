import { ArrowRight, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatRupiah } from "@/lib/format";

/**
 * Kartu utama laba: menjelaskan alur hitungan dengan bahasa sederhana
 * (Penjualan − Modal = Laba Kotor − Biaya = Laba Bersih) agar tidak membingungkan.
 */
export function AlurLaba({
  penjualan,
  modal,
  biaya,
  labaKotor,
  labaBersih,
  margin,
  keterangan,
}: {
  penjualan: number;
  modal: number;
  biaya: number;
  labaKotor: number;
  labaBersih: number;
  margin: number;
  keterangan?: string;
}) {
  const rugi = labaBersih < 0;

  return (
    <Card className="surface-card overflow-hidden rounded-xl p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 p-4">
        <div>
          <p className="text-xs text-muted-foreground">
            {rugi ? "Rugi Bersih" : "Untung Bersih"}
            {keterangan ? ` • ${keterangan}` : ""}
          </p>
          <p
            className={`text-3xl font-semibold tracking-tight ${rugi ? "text-destructive" : "text-success"}`}
          >
            {formatRupiah(labaBersih)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Ini uang yang benar-benar Anda dapat, setelah semua biaya.
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${
            rugi ? "bg-destructive/12 text-destructive" : "bg-success/12 text-success"
          }`}
        >
          {rugi ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
          Margin {margin.toFixed(1)}%
        </span>
      </div>

      <ol className="grid gap-2 p-4 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center">
        <Langkah label="Uang masuk dari penjualan" nilai={penjualan} />
        <Pemisah ikon="minus" />
        <Langkah label="Modal beli ikan" nilai={modal} nada="text-hutang" />
        <Pemisah ikon="panah" />
        <Langkah label="Laba kotor" nilai={labaKotor} nada="text-foreground" tebal />
      </ol>

      <ol className="grid gap-2 border-t border-border/60 p-4 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center">
        <Langkah label="Laba kotor" nilai={labaKotor} />
        <Pemisah ikon="minus" />
        <Langkah
          label="Biaya operasional (gaji, transport, es, dll)"
          nilai={biaya}
          nada="text-destructive"
        />
        <Pemisah ikon="panah" />
        <Langkah
          label={rugi ? "Rugi bersih" : "Untung bersih"}
          nilai={labaBersih}
          nada={rugi ? "text-destructive" : "text-success"}
          tebal
        />
      </ol>
    </Card>
  );
}

function Langkah({
  label,
  nilai,
  nada = "text-foreground",
  tebal,
}: {
  label: string;
  nilai: number;
  nada?: string;
  tebal?: boolean;
}) {
  return (
    <li className="rounded-lg bg-muted/40 p-2.5">
      <p className="text-[11px] leading-tight text-muted-foreground">{label}</p>
      <p className={`text-sm tabular-nums ${tebal ? "font-semibold" : "font-medium"} ${nada}`}>
        {formatRupiah(nilai)}
      </p>
    </li>
  );
}

function Pemisah({ ikon }: { ikon: "minus" | "panah" }) {
  return (
    <li aria-hidden className="hidden justify-center text-muted-foreground sm:flex">
      {ikon === "minus" ? <Minus className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
    </li>
  );
}
