import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FileSpreadsheet, FileText, Printer, Fish, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatRupiah } from "@/lib/format";
import { useLaporanHarian, tanggalIndo } from "@/lib/laporan-harian";
import { buatExcelHarian } from "@/lib/laporan-harian-excel";
import { unduhBlob } from "@/lib/workbook-laporan";

export const Route = createFileRoute("/_authenticated/laporan-harian")({
  head: () => ({
    meta: [
      { title: "Laporan Transaksi Harian | Bandar Ikan" },
      {
        name: "description",
        content:
          "Bukti transaksi harian bandar ikan: pembelian, penjualan, biaya operasional, ringkasan laba bersih, dan stok — siap cetak, PDF, dan Excel.",
      },
      { property: "og:title", content: "Laporan Transaksi Harian Bandar Ikan" },
      {
        property: "og:description",
        content: "Rekap otomatis seluruh transaksi harian, siap cetak dan diekspor.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LaporanHarianPage,
});

const kg = (n: number) => `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(n)} Kg`;

function LaporanHarianPage() {
  const [tanggal, setTanggal] = useState(() => new Date().toISOString().slice(0, 10));
  const [fSupplier, setFSupplier] = useState("semua");
  const [fPembeli, setFPembeli] = useState("semua");
  const [fIkan, setFIkan] = useState("semua");
  const [cari, setCari] = useState("");
  const [sibuk, setSibuk] = useState<"" | "excel" | "pdf">("");

  const { data, isLoading } = useLaporanHarian(tanggal);

  const opsi = useMemo(() => {
    const u = (a: string[]) => Array.from(new Set(a.filter(Boolean))).sort();
    return {
      supplier: u((data?.pembelian ?? []).map((r) => r.supplier)),
      pembeli: u((data?.penjualan ?? []).map((r) => r.pembeli)),
      ikan: u([
        ...(data?.pembelian ?? []).map((r) => r.jenis_ikan),
        ...(data?.penjualan ?? []).map((r) => r.jenis_ikan),
      ]),
    };
  }, [data]);

  const q = cari.trim().toLowerCase();
  const cocok = (...teks: string[]) => !q || teks.some((t) => t.toLowerCase().includes(q));

  const laporan = useMemo(() => {
    if (!data) return null;
    const pembelian = data.pembelian
      .filter(
        (r) =>
          (fSupplier === "semua" || r.supplier === fSupplier) &&
          (fIkan === "semua" || r.jenis_ikan === fIkan) &&
          cocok(r.kode, r.supplier, r.jenis_ikan),
      )
      .map((r, i) => ({ ...r, no: i + 1 }));
    const penjualan = data.penjualan
      .filter(
        (r) =>
          (fPembeli === "semua" || r.pembeli === fPembeli) &&
          (fIkan === "semua" || r.jenis_ikan === fIkan) &&
          cocok(r.kode, r.pembeli, r.jenis_ikan),
      )
      .map((r, i) => ({ ...r, no: i + 1 }));
    const biaya = data.biaya
      .filter((r) => cocok(r.kode, r.kategori, r.keterangan))
      .map((r, i) => ({ ...r, no: i + 1 }));
    return { ...data, pembelian, penjualan, biaya };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, fSupplier, fPembeli, fIkan, q]);

  const total = useMemo(() => {
    const beli = (laporan?.pembelian ?? []).reduce((a, r) => a + r.total, 0);
    const beratBeli = (laporan?.pembelian ?? []).reduce((a, r) => a + r.berat, 0);
    const jual = (laporan?.penjualan ?? []).reduce((a, r) => a + r.total, 0);
    const beratJual = (laporan?.penjualan ?? []).reduce((a, r) => a + r.berat, 0);
    const biaya = (laporan?.biaya ?? []).reduce((a, r) => a + r.nominal, 0);
    return {
      beli,
      beratBeli,
      jual,
      beratJual,
      biaya,
      pengeluaran: beli + biaya,
      laba: jual - beli - biaya,
    };

  }, [laporan]);

  async function unduhExcel() {
    if (!laporan) return;
    setSibuk("excel");
    try {
      const blob = await buatExcelHarian(laporan);
      unduhBlob(blob, `Laporan-Harian-${tanggal}.xlsx`);
      toast.success("Excel laporan harian diunduh");
    } catch (e) {
      console.error(e);
      toast.error("Gagal membuat file Excel");
    } finally {
      setSibuk("");
    }
  }

  async function unduhPDF() {
    if (!laporan) return;
    setSibuk("pdf");
    try {
      const [{ jsPDF }, autoTableMod] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const autoTable = autoTableMod.default;
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const W = doc.internal.pageSize.getWidth();

      doc.setFontSize(15);
      doc.text(laporan.perusahaan.toUpperCase(), W / 2, 40, { align: "center" });
      doc.setFontSize(12);
      doc.text("LAPORAN TRANSAKSI HARIAN", W / 2, 58, { align: "center" });
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text([laporan.alamat, laporan.telepon].filter(Boolean).join(" · "), W / 2, 72, {
        align: "center",
      });
      doc.setTextColor(0);
      doc.setFontSize(10);
      doc.text(`Tanggal : ${tanggalIndo(tanggal)}`, 40, 92);
      doc.text(`No. Laporan : ${laporan.nomor}`, W - 40, 92, { align: "right" });

      const head = { fillColor: [11, 63, 150] as [number, number, number], textColor: 255 };
      const opsiTabel = {
        margin: { left: 40, right: 40 },
        styles: { fontSize: 8, cellPadding: 4, lineWidth: 0.4, lineColor: [190, 200, 215] as [number, number, number] },
        headStyles: head,
      };
      let y = 108;
      const seksi = (judul: string) => {
        doc.setFontSize(10);
        doc.text(judul, 40, y);
        y += 6;
      };
      const lanjut = () => {
        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24;
        if (y > doc.internal.pageSize.getHeight() - 110) {
          doc.addPage();
          y = 50;
        }
      };

      seksi("A. DATA PEMBELIAN IKAN");
      autoTable(doc, {
        ...opsiTabel,
        startY: y,
        head: [["No", "Supplier", "Jenis Ikan", "Box", "Sisa Kg", "Total Berat", "Harga/Kg", "Total"]],
        body: laporan.pembelian.length
          ? laporan.pembelian.map((r) => [
              r.no,
              r.supplier,
              r.jenis_ikan,
              r.box,
              kg(r.sisa_kg),
              kg(r.berat),
              formatRupiah(r.harga),
              formatRupiah(r.total),
            ])
          : [["-", "Tidak ada pembelian", "", "", "", "", "", ""]],
        foot: [["", "TOTAL", "", "", "", kg(total.beratBeli), "", formatRupiah(total.beli)]],
        footStyles: { fillColor: [232, 238, 249], textColor: 20, fontStyle: "bold" },
      });
      lanjut();

      seksi("B. BIAYA OPERASIONAL");
      autoTable(doc, {
        ...opsiTabel,
        startY: y,
        head: [["No", "Kategori", "Keterangan", "Nominal"]],
        body: laporan.biaya.length
          ? laporan.biaya.map((r) => [r.no, r.kategori, r.keterangan, formatRupiah(r.nominal)])
          : [["-", "Tidak ada biaya", "", ""]],
        foot: [["", "TOTAL OPERASIONAL", "", formatRupiah(total.biaya)]],
        footStyles: { fillColor: [232, 238, 249], textColor: 20, fontStyle: "bold" },
      });
      lanjut();

      seksi("C. TOTAL PENGELUARAN (PEMBELIAN + OPERASIONAL)");
      autoTable(doc, {
        ...opsiTabel,
        startY: y,
        head: [["Total Pembelian", "Total Operasional", "Total Pengeluaran"]],
        body: [
          [formatRupiah(total.beli), formatRupiah(total.biaya), formatRupiah(total.pengeluaran)],
        ],
      });
      lanjut();

      seksi("D. DATA PENJUALAN");
      autoTable(doc, {
        ...opsiTabel,
        startY: y,
        head: [["No", "Pembeli", "Jenis Ikan", "Berat Terjual", "Harga Jual/Kg", "Total"]],
        body: laporan.penjualan.length
          ? laporan.penjualan.map((r) => [
              r.no,
              r.pembeli,
              r.jenis_ikan,
              kg(r.berat),
              formatRupiah(r.harga),
              formatRupiah(r.total),
            ])
          : [["-", "Tidak ada penjualan", "", "", "", ""]],
        foot: [["", "TOTAL", "", kg(total.beratJual), "", formatRupiah(total.jual)]],
        footStyles: { fillColor: [232, 238, 249], textColor: 20, fontStyle: "bold" },
      });
      lanjut();

      seksi("E. RINGKASAN KEUANGAN");
      autoTable(doc, {
        ...opsiTabel,
        startY: y,
        head: [
          ["Total Pembelian", "Total Operasional", "Total Pengeluaran", "Total Penjualan", "Laba Bersih"],
        ],
        body: [
          [
            formatRupiah(total.beli),
            formatRupiah(total.biaya),
            formatRupiah(total.pengeluaran),
            formatRupiah(total.jual),
            formatRupiah(total.laba),
          ],
        ],
      });

      lanjut();

      seksi("F. STOK");
      autoTable(doc, {
        ...opsiTabel,
        startY: y,
        head: [["Total Berat Masuk", "Total Berat Keluar", "Sisa Stok", "Nilai Persediaan"]],
        body: [
          [
            kg(laporan.stok.masuk),
            kg(laporan.stok.keluar),
            kg(laporan.stok.sisa),
            formatRupiah(laporan.stok.nilai),
          ],
        ],
      });

      const halaman = doc.getNumberOfPages();
      for (let i = 1; i <= halaman; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(130);
        doc.text(
          `${laporan.nomor} · Halaman ${i} dari ${halaman} · dicetak ${new Date().toLocaleString("id-ID")}`,
          40,
          doc.internal.pageSize.getHeight() - 20,
        );
      }
      doc.save(`Laporan-Harian-${tanggal}.pdf`);
      toast.success("PDF laporan harian diunduh");
    } catch (e) {
      console.error(e);
      toast.error("Gagal membuat PDF");
    } finally {
      setSibuk("");
    }
  }

  return (
    <AppShell title="Laporan Harian">
      <div className="mx-auto w-full max-w-[1100px] space-y-4 px-4 py-4">
        <Card className="grid gap-3 p-4 no-print sm:grid-cols-[repeat(4,1fr)]">
          <div className="space-y-1.5">
            <Label htmlFor="tgl">Tanggal</Label>
            <Input
              id="tgl"
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
            />
          </div>
          <FilterSelect
            label="Supplier"
            value={fSupplier}
            onChange={setFSupplier}
            options={opsi.supplier}
            semuaLabel="Semua supplier"
          />
          <FilterSelect
            label="Pembeli"
            value={fPembeli}
            onChange={setFPembeli}
            options={opsi.pembeli}
            semuaLabel="Semua pembeli"
          />
          <FilterSelect
            label="Jenis Ikan"
            value={fIkan}
            onChange={setFIkan}
            options={opsi.ikan}
            semuaLabel="Semua jenis ikan"
          />
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="cari">Pencarian cepat</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="cari"
                className="pl-8"
                placeholder="No. transaksi, supplier, pembeli, jenis ikan"
                value={cari}
                onChange={(e) => setCari(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-2 sm:col-span-2">
            <Button size="sm" onClick={() => void unduhExcel()} disabled={sibuk !== ""}>
              {sibuk === "excel" ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="mr-1.5 h-4 w-4" />
              )}
              Export Excel
            </Button>
            <Button size="sm" variant="secondary" onClick={() => void unduhPDF()} disabled={sibuk !== ""}>
              {sibuk === "pdf" ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-1.5 h-4 w-4" />
              )}
              Export PDF
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.print()}>
              <Printer className="mr-1.5 h-4 w-4" /> Cetak
            </Button>
          </div>
        </Card>

        {isLoading || !laporan ? (
          <Skeleton className="h-96 w-full" />
        ) : (
          <div className="lembar-cetak rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm">
            <header className="flex items-start justify-between gap-4 border-b-2 border-primary pb-4">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-lg bg-primary text-primary-foreground">
                  <Fish className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-lg font-bold uppercase tracking-wide text-primary">
                    {laporan.perusahaan}
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    {[laporan.alamat, laporan.telepon].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-base font-bold">LAPORAN TRANSAKSI HARIAN</div>
                <div className="text-xs text-muted-foreground">{tanggalIndo(tanggal)}</div>
                <div className="mt-1 font-mono text-xs font-semibold">{laporan.nomor}</div>
              </div>
            </header>

            <Seksi judul="A. DATA PEMBELIAN IKAN">
              <Tabel
                kolom={[
                  "No",
                  "Supplier",
                  "Jenis Ikan",
                  "Jumlah Box",
                  "Sisa Kg",
                  "Total Berat (Kg)",
                  "Harga/Kg",
                  "Total Pembelian",
                ]}
                angka={[3, 4, 5, 6, 7]}
                rows={laporan.pembelian.map((r) => [
                  r.no,
                  r.supplier,
                  r.jenis_ikan,
                  new Intl.NumberFormat("id-ID").format(r.box),
                  kg(r.sisa_kg),
                  kg(r.berat),
                  formatRupiah(r.harga),
                  formatRupiah(r.total),
                ])}
                footer={["", "TOTAL", "", "", "", kg(total.beratBeli), "", formatRupiah(total.beli)]}
              />
            </Seksi>

            <Seksi judul="B. BIAYA OPERASIONAL">
              <Tabel
                kolom={["No", "Kategori", "Keterangan", "Nominal"]}
                angka={[3]}
                rows={laporan.biaya.map((r) => [
                  r.no,
                  r.kategori,
                  r.keterangan || "—",
                  formatRupiah(r.nominal),
                ])}
                footer={["", "TOTAL OPERASIONAL", "", formatRupiah(total.biaya)]}
              />
            </Seksi>

            <Seksi judul="C. TOTAL PENGELUARAN (PEMBELIAN + OPERASIONAL)">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Kotak label="Total Pembelian" nilai={formatRupiah(total.beli)} />
                <Kotak label="Total Operasional" nilai={formatRupiah(total.biaya)} />
                <Kotak
                  label="Total Pengeluaran"
                  nilai={formatRupiah(total.pengeluaran)}
                  utama
                  warna="text-warning"
                />
              </div>
            </Seksi>

            <Seksi judul="D. DATA PENJUALAN">
              <Tabel
                kolom={["No", "Pembeli", "Jenis Ikan", "Berat Terjual", "Harga Jual/Kg", "Total Penjualan"]}
                angka={[3, 4, 5]}
                rows={laporan.penjualan.map((r) => [
                  r.no,
                  r.pembeli,
                  r.jenis_ikan,
                  kg(r.berat),
                  formatRupiah(r.harga),
                  formatRupiah(r.total),
                ])}
                footer={["", "TOTAL", "", kg(total.beratJual), "", formatRupiah(total.jual)]}
              />
            </Seksi>

            <Seksi judul="E. RINGKASAN KEUANGAN">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Kotak label="Total Pembelian" nilai={formatRupiah(total.beli)} />
                <Kotak label="Total Operasional" nilai={formatRupiah(total.biaya)} />
                <Kotak label="Total Pengeluaran" nilai={formatRupiah(total.pengeluaran)} />
                <Kotak label="Total Penjualan" nilai={formatRupiah(total.jual)} />
                <Kotak
                  label="Laba Bersih (Penjualan − Pengeluaran)"
                  nilai={formatRupiah(total.laba)}
                  utama
                  warna={total.laba >= 0 ? "text-success" : "text-destructive"}
                />
              </div>
            </Seksi>


            <Seksi judul="E. STOK">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Kotak label="Total Berat Masuk" nilai={kg(laporan.stok.masuk)} />
                <Kotak label="Total Berat Keluar" nilai={kg(laporan.stok.keluar)} />
                <Kotak label="Sisa Stok" nilai={kg(laporan.stok.sisa)} />
                <Kotak label="Nilai Persediaan" nilai={formatRupiah(laporan.stok.nilai)} />
              </div>
            </Seksi>

            <footer className="mt-6 border-t border-border pt-3 text-[11px] text-muted-foreground">
              {laporan.nomor} · Dicetak otomatis oleh ERP {laporan.perusahaan} pada{" "}
              {new Date().toLocaleString("id-ID")}
            </footer>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Seksi({ judul, children }: { judul: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h2 className="mb-2 rounded bg-primary/10 px-3 py-1.5 text-sm font-bold text-primary">
        {judul}
      </h2>
      {children}
    </section>
  );
}

function Tabel({
  kolom,
  rows,
  footer,
  angka,
}: {
  kolom: string[];
  rows: (string | number)[][];
  footer: (string | number)[];
  angka: number[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            {kolom.map((k, i) => (
              <th
                key={k + i}
                className={`border border-border bg-primary px-2 py-1.5 font-semibold text-primary-foreground ${
                  angka.includes(i) ? "text-right" : "text-left"
                }`}
              >
                {k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={kolom.length}
                className="border border-border px-2 py-3 text-center text-muted-foreground"
              >
                Belum ada data pada tanggal ini
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr key={i} className={i % 2 ? "bg-muted/40" : undefined}>
                {r.map((c, j) => (
                  <td
                    key={j}
                    className={`border border-border px-2 py-1.5 ${
                      angka.includes(j) ? "text-right tabular-nums" : "text-left"
                    }`}
                  >
                    {c}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr className="bg-primary/10 font-bold">
            {footer.map((c, i) => (
              <td
                key={i}
                className={`border border-border px-2 py-1.5 ${
                  angka.includes(i) ? "text-right tabular-nums" : "text-left"
                }`}
              >
                {c}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function Kotak({
  label,
  nilai,
  utama,
  warna,
}: {
  label: string;
  nilai: string;
  utama?: boolean;
  warna?: string;
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 ${
        utama ? "border-primary bg-primary/10" : "border-border bg-muted/30"
      }`}
    >
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`text-sm font-bold tabular-nums ${warna ?? ""}`}>{nilai}</div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  semuaLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  semuaLabel: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="semua">{semuaLabel}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
