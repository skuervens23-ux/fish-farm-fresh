import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldAlert, Check, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { BadgeBayar } from "@/components/StatusBadges";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatRupiah, formatTanggal } from "@/lib/format";
import { useTransaksi, tinjauTransaksi, type Transaksi } from "@/lib/transaksi";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/persetujuan")({
  head: () => ({
    meta: [
      { title: "Persetujuan Transaksi | Bandar Ikan" },
      {
        name: "description",
        content: "Antrian transaksi yang menunggu persetujuan admin: setujui atau tolak dengan alasan.",
      },
      { property: "og:title", content: "Persetujuan Transaksi" },
      { property: "og:description", content: "Setujui atau tolak transaksi yang dikirim mandor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PersetujuanPage,
});

function PersetujuanPage() {
  const { isOwner, isLoading: loadingRole } = useUserRole();
  const { data: rows = [], isLoading } = useTransaksi();
  const qc = useQueryClient();
  const [tolak, setTolak] = useState<Transaksi | null>(null);
  const [alasan, setAlasan] = useState("");
  const [busy, setBusy] = useState(false);

  const antrian = useMemo(() => rows.filter((r) => r.status_transaksi === "menunggu"), [rows]);

  function refresh() {
    qc.invalidateQueries({ queryKey: ["transaksi"] });
    qc.invalidateQueries({ queryKey: ["menunggu-count"] });
  }

  async function setujui(r: Transaksi) {
    setBusy(true);
    try {
      await tinjauTransaksi(r.jenis, r.id, "disetujui");
      toast.success("Transaksi disetujui");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyetujui");
    } finally {
      setBusy(false);
    }
  }

  async function kirimTolak() {
    if (!tolak) return;
    if (alasan.trim().length < 4) return toast.error("Tulis alasan penolakan");
    setBusy(true);
    try {
      await tinjauTransaksi(tolak.jenis, tolak.id, "ditolak", alasan.trim());
      toast.success("Transaksi ditolak");
      setTolak(null);
      setAlasan("");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menolak");
    } finally {
      setBusy(false);
    }
  }

  if (!loadingRole && !isOwner) {
    return (
      <AppShell title="Persetujuan">
        <div className="mx-auto max-w-[520px] px-4 py-8">
          <Card className="p-6 text-center">
            <ShieldAlert className="mx-auto h-8 w-8 text-warning" />
            <p className="mt-3 text-sm font-medium">Akses ditolak</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Hanya owner/admin yang dapat menyetujui transaksi.
            </p>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Persetujuan">
      <div className="mx-auto w-full max-w-[900px] space-y-3 px-4 py-4">
        {isLoading && <Skeleton className="h-24 w-full" />}
        {!isLoading && antrian.length === 0 && (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            Tidak ada transaksi yang menunggu persetujuan.
          </Card>
        )}
        {antrian.map((r) => (
          <Card key={`${r.jenis}-${r.id}`} className="space-y-3 p-4">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-foreground">
                  {r.jenis === "pembelian" ? "Pembelian" : "Penjualan"} {r.jenis_ikan}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {r.pihak} · {formatTanggal(r.tanggal)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold">{formatRupiah(r.total)}</div>
                <BadgeBayar status={r.status_bayar} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button disabled={busy} onClick={() => void setujui(r)}>
                <Check className="mr-1 h-4 w-4" /> Setujui
              </Button>
              <Button variant="outline" disabled={busy} onClick={() => setTolak(r)}>
                <X className="mr-1 h-4 w-4" /> Tolak
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={tolak !== null} onOpenChange={(v) => !v && setTolak(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tolak Transaksi</DialogTitle>
            <DialogDescription>
              Mandor wajib diberi alasan agar bisa memperbaiki data.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={alasan}
            onChange={(e) => setAlasan(e.target.value)}
            rows={3}
            placeholder="Contoh: foto nota tidak terbaca"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setTolak(null)} disabled={busy}>
              Batal
            </Button>
            <Button onClick={() => void kirimTolak()} disabled={busy}>
              Tolak Transaksi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
