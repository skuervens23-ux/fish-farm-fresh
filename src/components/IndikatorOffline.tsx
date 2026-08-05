import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CloudOff, RefreshCw, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { useAntrianOffline } from "@/lib/offline";
import { cn } from "@/lib/utils";

export function IndikatorOffline() {
  const { online, jumlah, menyinkron, sinkron } = useAntrianOffline();
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
    <button
      type="button"
      onClick={() => void sinkron()}
      disabled={!online || menyinkron || jumlah === 0}
      title={
        online
          ? `${jumlah} transaksi menunggu sinkronisasi — ketuk untuk kirim sekarang`
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
  );
}
