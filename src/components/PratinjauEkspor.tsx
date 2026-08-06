import { useEffect, useState } from "react";
import { Download, Loader2, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { unduhBlob } from "@/lib/workbook-laporan";

export type BerkasPratinjau = {
  blob: Blob;
  namaFile: string;
  jenis: "pdf" | "excel";
} | null;

/** Pratinjau berkas ekspor (PDF/Excel) sebelum benar-benar diunduh. */
export function PratinjauEkspor({
  berkas,
  onClose,
}: {
  berkas: BerkasPratinjau;
  onClose: () => void;
}) {
  const [urlPdf, setUrlPdf] = useState("");
  const [sheets, setSheets] = useState<{ nama: string; html: string }[]>([]);
  const [aktif, setAktif] = useState(0);
  const [memuat, setMemuat] = useState(false);

  useEffect(() => {
    if (!berkas) return;
    setAktif(0);
    if (berkas.jenis === "pdf") {
      const u = URL.createObjectURL(berkas.blob);
      setUrlPdf(u);
      return () => URL.revokeObjectURL(u);
    }
    let batal = false;
    setMemuat(true);
    void (async () => {
      try {
        const XLSX = await import("xlsx");
        const buf = await berkas.blob.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const hasil = wb.SheetNames.map((nama) => ({
          nama,
          html: XLSX.utils.sheet_to_html(wb.Sheets[nama]!),
        }));
        if (!batal) setSheets(hasil);
      } finally {
        if (!batal) setMemuat(false);
      }
    })();
    return () => {
      batal = true;
    };
  }, [berkas]);

  const buka = Boolean(berkas);

  return (
    <Dialog open={buka} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex h-[88vh] max-w-5xl flex-col gap-3 p-4">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-base">Pratinjau — {berkas?.namaFile}</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Periksa dulu isinya. Klik Unduh bila sudah sesuai.
          </p>
        </DialogHeader>

        {berkas?.jenis === "excel" && sheets.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {sheets.map((s, i) => (
              <Button
                key={s.nama}
                size="sm"
                variant={i === aktif ? "default" : "outline"}
                onClick={() => setAktif(i)}
              >
                {s.nama}
              </Button>
            ))}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-auto rounded-md border border-border bg-background">
          {berkas?.jenis === "pdf" ? (
            urlPdf ? (
              <iframe title="Pratinjau PDF" src={urlPdf} className="h-full w-full" />
            ) : null
          ) : memuat ? (
            <div className="grid h-full place-items-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <div
              className="pratinjau-excel p-3 text-sm"
              dangerouslySetInnerHTML={{ __html: sheets[aktif]?.html ?? "" }}
            />
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            <X className="mr-1.5 h-4 w-4" /> Tutup
          </Button>
          <Button
            onClick={() => {
              if (berkas) unduhBlob(berkas.blob, berkas.namaFile);
            }}
          >
            <Download className="mr-1.5 h-4 w-4" /> Unduh
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
