import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CloudOff, RefreshCw, Trash2, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { hapusAntrian, useAntrianOffline } from "@/lib/offline";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

export function IndikatorOffline() {
  const { online, items, jumlah, menyinkron, sinkron } = useAntrianOffline();
  const qc = useQueryClient();
  const sebelumnya = useRef(jumlah);

  useEffect(() => {
    if (sebelumnya.current > 0 && jumlah < sebelumnya.current) {
      const terkirim = sebelumnya.current - jumlah;
      toast.success(`${terkirim} transaksi offline berhasil disinkronkan`);
      qc.invalidateQueries({ queryKey: ["transaksi"] });
      qc.invalidateQueries({ queryKey: ["pembelian"] });
      qc.invalidateQueries({ queryKey: ["analitik"] });
    }
    sebelumnya.current = jumlah;
  }, [jumlah, qc]);

  if (online && jumlah === 0) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={
            online
              ? `${jumlah} transaksi menunggu sinkronisasi`
              : "Mode offline: transaksi disimpan di perangkat"
          }
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-md border px-2 text-xs font-medium",
            online
              ? "border-warning/40 bg-warning/10 text-warning"
              : "border-border bg-muted text-muted-foreground",
          )}
        >
          {menyinkron ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : online ? (
            <CloudOff className="h-4 w-4" />
          ) : (
            <WifiOff className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">{online ? "Menunggu sinkron" : "Offline"}</span>
          {jumlah > 0 && <span>{jumlah}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-3">
        <div className="mb-2 text-sm font-semibold">
          {online ? "Transaksi menunggu sinkron" : "Mode offline aktif"}
        </div>
        {jumlah === 0 ? (
          <p className="text-xs text-muted-foreground">
            Tidak ada transaksi tertahan. Input baru akan disimpan di perangkat sampai koneksi
            kembali.
          </p>
        ) : (
          <ul className="max-h-56 space-y-2 overflow-y-auto">
            {items.map((i) => (
              <li key={i.id} className="rounded-md border border-border p-2 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{i.ringkas}</p>
                    <p className="text-muted-foreground">
                      {new Date(i.dibuat_pada).toLocaleString("id-ID")}
                      {i.percobaan > 0 && ` • ${i.percobaan}× gagal`}
                    </p>
                    {i.error && <p className="mt-1 text-destructive">{i.error}</p>}
                  </div>
                  <button
                    type="button"
                    aria-label="Hapus dari antrean"
                    onClick={() => hapusAntrian(i.id)}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <Button
          type="button"
          size="sm"
          className="mt-3 w-full"
          disabled={!online || menyinkron || jumlah === 0}
          onClick={() => void sinkron()}
        >
          {menyinkron ? "Menyinkronkan…" : "Sinkron sekarang"}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
