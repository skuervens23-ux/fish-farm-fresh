import { useState } from "react";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ambilDataLaporan } from "@/lib/ekspor-excel";
import { buatWorkbookLaporan, unduhBlob } from "@/lib/workbook-laporan";

/** Unduh workbook Excel lengkap (formula aktif) untuk periode terpilih. */
export function TombolExcelLengkap({ dari, sampai }: { dari: string; sampai: string }) {
  const [sibuk, setSibuk] = useState(false);

  async function jalankan() {
    setSibuk(true);
    try {
      const data = await ambilDataLaporan(dari, sampai);
      if (data.pembelian.length === 0 && data.penjualan.length === 0) {
        toast.error("Tidak ada transaksi pada periode ini");
        return;
      }
      const blob = await buatWorkbookLaporan(data);
      unduhBlob(blob, `Laporan-Bandar-Ikan-${dari}_sd_${sampai}.xlsx`);
      toast.success("Workbook Excel berformula berhasil diunduh");
    } catch (e) {
      console.error(e);
      toast.error("Gagal membuat workbook Excel");
    } finally {
      setSibuk(false);
    }
  }

  return (
    <Button size="sm" onClick={() => void jalankan()} disabled={sibuk}>
      {sibuk ? (
        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
      ) : (
        <FileSpreadsheet className="mr-1.5 h-4 w-4" />
      )}
      Excel Lengkap
    </Button>
  );
}
