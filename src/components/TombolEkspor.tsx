import { useState } from "react";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { eksporExcel, eksporPDF, type Lembar } from "@/lib/ekspor";

export function TombolEkspor({
  judul,
  subjudul,
  namaFile,
  data,
  label = "Ekspor",
}: {
  judul: string;
  subjudul: string;
  /** Nama file tanpa ekstensi. */
  namaFile: string;
  /** Dipanggil saat diklik agar data selalu terbaru. */
  data: () => Lembar[];
  label?: string;
}) {
  const [sibuk, setSibuk] = useState(false);

  async function jalankan(format: "excel" | "pdf") {
    setSibuk(true);
    try {
      const lembar = data();
      if (lembar.every((l) => l.rows.length === 0)) {
        toast.error("Tidak ada data pada periode ini");
        return;
      }
      if (format === "excel") await eksporExcel(lembar, `${namaFile}.xlsx`);
      else await eksporPDF(judul, subjudul, lembar, `${namaFile}.pdf`);
      toast.success(`Laporan ${format === "excel" ? "Excel" : "PDF"} diunduh`);
    } catch {
      toast.error("Gagal membuat file ekspor");
    } finally {
      setSibuk(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={sibuk}>
          {sibuk ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-1.5 h-4 w-4" />
          )}
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => void jalankan("excel")}>
          <FileSpreadsheet className="mr-2 h-4 w-4" /> Unduh Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void jalankan("pdf")}>
          <FileText className="mr-2 h-4 w-4" /> Unduh PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
