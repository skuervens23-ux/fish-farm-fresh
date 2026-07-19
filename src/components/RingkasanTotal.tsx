import { formatRupiah } from "@/lib/format";

export function RingkasanTotal({ total, sisa }: { total: number; sisa?: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">Total Harga</div>
      <div className="mt-1 text-2xl font-bold text-foreground">{formatRupiah(total)}</div>
      {typeof sisa === "number" && sisa > 0 && (
        <div className="mt-2 text-sm text-muted-foreground">
          Sisa hutang: <span className="font-semibold text-destructive">{formatRupiah(sisa)}</span>
        </div>
      )}
    </div>
  );
}
