import { Download, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/** Tampilkan laporan harian dalam bentuk gambar, langsung di dalam aplikasi. */
export function PratinjauGambar({
  src,
  namaFile,
  onClose,
}: {
  src: string;
  namaFile: string;
  onClose: () => void;
}) {
  return (
    <Dialog open={Boolean(src)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex h-[88vh] max-w-3xl flex-col gap-3 p-4">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-base">Laporan Harian</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Semua transaksi — pembelian, penjualan, dan operasional — menyatu dalam satu laporan.
          </p>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-auto rounded-md border border-border bg-muted/30 p-3">
          {src ? (
            <img src={src} alt="Laporan harian gabungan" className="mx-auto w-full max-w-2xl" />
          ) : null}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            <X className="mr-1.5 h-4 w-4" /> Tutup
          </Button>
          <Button
            onClick={() => {
              const a = document.createElement("a");
              a.href = src;
              a.download = namaFile;
              a.click();
            }}
          >
            <Download className="mr-1.5 h-4 w-4" /> Simpan Gambar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
