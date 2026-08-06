/* eslint-disable @typescript-eslint/no-explicit-any */
import type { LaporanHarian } from "@/lib/laporan-harian";

const RP = "#,##0";
const GARIS = "FF9AA3B2";

const bawah = (style: "thin" | "double" = "thin") => ({
  bottom: { style, color: { argb: GARIS } },
});

/** Sheet "Catatan Harian": meniru buku tulis harian (nama · angka · kode · nominal · total). */
export function tambahSheetCatatan(wb: any, d: LaporanHarian) {
  const ws = wb.addWorksheet("Catatan Harian", {
    pageSetup: {
      paperSize: 9,
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.6, right: 0.6, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 },
    },
  });
  ws.columns = [{ width: 22 }, { width: 12 }, { width: 10 }, { width: 20 }];

  const tgl = new Date(`${d.tanggal}T00:00:00`);
  const judul = `${tgl.getDate()}.${tgl.getMonth() + 1}.${tgl.getFullYear()}`;

  ws.mergeCells(1, 1, 1, 4);
  const t = ws.getCell(1, 1);
  t.value = judul;
  t.font = { name: "Calibri", size: 14, bold: true };
  t.alignment = { horizontal: "center" };
  ws.getRow(1).height = 24;

  let r = 3;
  const awal = r;

  const tulis = (
    nama: string,
    angka: number | string,
    kode: string,
    nominal: number | null,
    tebal = false,
  ) => {
    const row = ws.getRow(r);
    row.height = 20;
    const nilai: any[] = [nama, angka === 0 ? "" : angka, kode, nominal];
    nilai.forEach((v, i) => {
      const c = row.getCell(i + 1);
      c.value = v ?? "";
      c.font = { name: "Calibri", size: 12, bold: tebal };
      c.border = bawah();
      c.alignment = {
        horizontal: i === 0 ? "left" : i === 3 ? "right" : "center",
        vertical: "middle",
      };
      if (i === 1 && typeof v === "number") c.numFmt = "#,##0.00";
      if (i === 3) c.numFmt = RP;
    });
    r++;
  };

  // Pembelian ikan: nama supplier · berat · jenis ikan · nominal
  for (const b of d.pembelian) tulis(b.supplier, b.berat, b.jenis_ikan, b.total);

  // Penjualan (jika ada) ditandai kode jual
  for (const j of d.penjualan) tulis(j.pembeli, j.berat, "jual", j.total);

  // Biaya operasional: muat, jalan, mobil, perahu, dll.
  for (const b of d.biaya) tulis(b.kategori.toLowerCase(), "", "", b.nominal);

  const akhir = r - 1;

  // Total akhir dengan garis ganda seperti catatan manual
  const row = ws.getRow(r);
  row.height = 22;
  for (let i = 1; i <= 4; i++) {
    const c = row.getCell(i);
    c.font = { name: "Calibri", size: 13, bold: true };
    c.border = bawah("double");
    c.alignment = { horizontal: i === 4 ? "right" : "left", vertical: "middle" };
  }
  row.getCell(1).value = "TOTAL";
  const tot = row.getCell(4);
  tot.value = { formula: akhir >= awal ? `SUM(D${awal}:D${akhir})` : "0" };
  tot.numFmt = RP;

  return ws;
}
