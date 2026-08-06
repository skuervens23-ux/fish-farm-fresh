/* eslint-disable @typescript-eslint/no-explicit-any */
import type { LaporanHarian } from "@/lib/laporan-harian";
import { tanggalIndo } from "@/lib/laporan-harian";
import { tambahSheetBukuBesar } from "@/lib/buku-besar-excel";
import { tambahSheetCatatan } from "@/lib/catatan-harian-excel";

const BIRU = "FF0B3F96";
const BIRU_MUDA = "FFE8EEF9";
const RP = '"Rp" #,##0;[Red]-"Rp" #,##0';
const KG = '#,##0.00" Kg"';

const tepi = () => ({
  top: { style: "thin" as const, color: { argb: "FFBFC7D5" } },
  left: { style: "thin" as const, color: { argb: "FFBFC7D5" } },
  bottom: { style: "thin" as const, color: { argb: "FFBFC7D5" } },
  right: { style: "thin" as const, color: { argb: "FFBFC7D5" } },
});

function judulSeksi(ws: any, baris: number, teks: string, lebar: number) {
  ws.mergeCells(baris, 1, baris, lebar);
  const c = ws.getCell(baris, 1);
  c.value = teks;
  c.font = { name: "Calibri", size: 12, bold: true, color: { argb: BIRU } };
  c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BIRU_MUDA } };
  c.alignment = { vertical: "middle" };
  c.border = tepi();
  ws.getRow(baris).height = 20;
}

function headerTabel(ws: any, baris: number, kolom: string[]) {
  const row = ws.getRow(baris);
  kolom.forEach((k, i) => {
    const c = row.getCell(i + 1);
    c.value = k;
    c.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BIRU } };
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    c.border = tepi();
  });
  row.height = 24;
}

function isiBaris(ws: any, baris: number, nilai: any[], format: (string | null)[]) {
  const row = ws.getRow(baris);
  nilai.forEach((v, i) => {
    const c = row.getCell(i + 1);
    c.value = v;
    c.font = { name: "Calibri", size: 11 };
    c.border = tepi();
    const f = format[i];
    if (f) {
      c.numFmt = f;
      c.alignment = { horizontal: "right" };
    }
  });
}

function barisTotal(ws: any, baris: number, label: string, span: number, sel: [number, string][]) {
  ws.mergeCells(baris, 1, baris, span);
  const l = ws.getCell(baris, 1);
  l.value = label;
  l.alignment = { horizontal: "right" };
  const row = ws.getRow(baris);
  row.font = { name: "Calibri", size: 11, bold: true };
  row.eachCell({ includeEmpty: false }, (c: any) => {
    c.border = tepi();
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BIRU_MUDA } };
  });
  for (const [kol, fmt] of sel) {
    const c = ws.getCell(baris, kol);
    c.border = tepi();
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BIRU_MUDA } };
    c.font = { name: "Calibri", size: 11, bold: true };
    c.numFmt = fmt;
    c.alignment = { horizontal: "right" };
  }
}

const rentang = (kolom: string, a: number, b: number) =>
  b >= a ? `SUM(${kolom}${a}:${kolom}${b})` : "0";

/** Bangun workbook laporan harian bergaya laporan manual Excel (A4 landscape). */
export async function buatExcelHarian(d: LaporanHarian): Promise<Blob> {
  const ExcelJS = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = d.perusahaan;
  wb.created = new Date();

  tambahSheetCatatan(wb, d);

  const ws = wb.addWorksheet("Laporan Harian", {
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
    },
  });
  const L = 8;
  ws.columns = [
    { width: 6 },
    { width: 26 },
    { width: 20 },
    { width: 14 },
    { width: 14 },
    { width: 16 },
    { width: 16 },
    { width: 20 },
  ];

  // Header
  ws.mergeCells(1, 1, 1, L);
  const t = ws.getCell(1, 1);
  t.value = d.perusahaan.toUpperCase();
  t.font = { name: "Calibri", size: 16, bold: true, color: { argb: BIRU } };
  t.alignment = { horizontal: "center" };
  ws.getRow(1).height = 24;

  ws.mergeCells(2, 1, 2, L);
  const s = ws.getCell(2, 1);
  s.value = "LAPORAN TRANSAKSI HARIAN";
  s.font = { name: "Calibri", size: 13, bold: true };
  s.alignment = { horizontal: "center" };

  ws.mergeCells(3, 1, 3, L);
  const info = ws.getCell(3, 1);
  info.value = [d.alamat, d.telepon].filter(Boolean).join(" · ");
  info.font = { name: "Calibri", size: 10, italic: true, color: { argb: "FF666666" } };
  info.alignment = { horizontal: "center" };

  ws.mergeCells(4, 1, 4, 4);
  ws.getCell(4, 1).value = `Tanggal : ${tanggalIndo(d.tanggal)}`;
  ws.mergeCells(4, 5, 4, L);
  const no = ws.getCell(4, 5);
  no.value = `No. Laporan : ${d.nomor}`;
  no.alignment = { horizontal: "right" };

  let r = 6;

  // A. Pembelian
  judulSeksi(ws, r++, "A. DATA PEMBELIAN IKAN", L);
  headerTabel(ws, r++, [
    "No",
    "Supplier",
    "Jenis Ikan",
    "Jumlah Box",
    "Sisa Kg",
    "Total Berat (Kg)",
    "Harga/Kg",
    "Total Pembelian",
  ]);
  const beliAwal = r;
  for (const b of d.pembelian) {
    isiBaris(
      ws,
      r,
      [b.no, b.supplier, b.jenis_ikan, b.box, b.sisa_kg, b.berat, b.harga, { formula: `F${r}*G${r}` }],
      [null, null, null, "#,##0", KG, KG, RP, RP],
    );
    r++;
  }
  const beliAkhir = r - 1;
  barisTotal(ws, r, "TOTAL PEMBELIAN", 5, [
    [6, KG],
    [8, RP],
  ]);
  ws.getCell(r, 6).value = { formula: rentang("F", beliAwal, beliAkhir) };
  ws.getCell(r, 8).value = { formula: rentang("H", beliAwal, beliAkhir) };
  const selTotalBeli = `H${r}`;
  r += 2;

  // B. Biaya operasional
  judulSeksi(ws, r++, "B. BIAYA OPERASIONAL", L);
  headerTabel(ws, r++, ["No", "Kategori", "Keterangan", "Nominal", "", "", "", ""]);
  const biayaAwal = r;
  for (const b of d.biaya) {
    isiBaris(
      ws,
      r,
      [b.no, b.kategori, b.keterangan, b.nominal, "", "", "", ""],
      [null, null, null, RP, null, null, null, null],
    );
    r++;
  }
  const biayaAkhir = r - 1;
  barisTotal(ws, r, "TOTAL OPERASIONAL", 3, [[4, RP]]);
  ws.getCell(r, 4).value = { formula: rentang("D", biayaAwal, biayaAkhir) };
  const selTotalBiaya = `D${r}`;
  r += 2;

  // C. Total pengeluaran
  judulSeksi(ws, r++, "C. TOTAL PENGELUARAN (PEMBELIAN + OPERASIONAL)", L);
  const pengeluaran: [string, string][] = [
    ["Total Pembelian", selTotalBeli],
    ["Total Operasional", selTotalBiaya],
    ["Total Pengeluaran", `${selTotalBeli}+${selTotalBiaya}`],
  ];
  for (const [label, formula] of pengeluaran) {
    ws.mergeCells(r, 1, r, 3);
    const l = ws.getCell(r, 1);
    l.value = label;
    l.font = { name: "Calibri", size: 11, bold: label === "Total Pengeluaran" };
    l.border = tepi();
    const v = ws.getCell(r, 4);
    v.value = { formula };
    v.numFmt = RP;
    v.font = { name: "Calibri", size: 11, bold: true };
    v.alignment = { horizontal: "right" };
    v.border = tepi();
    if (label === "Total Pengeluaran") {
      for (const c of [l, v])
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BIRU_MUDA } };
    }
    r++;
  }
  const selPengeluaran = `D${r - 1}`;
  r++;

  // D. Penjualan
  judulSeksi(ws, r++, "D. DATA PENJUALAN", L);
  headerTabel(ws, r++, [
    "No",
    "Pembeli",
    "Jenis Ikan",
    "Berat Terjual (Kg)",
    "Harga Jual/Kg",
    "Total Penjualan",
    "",
    "",
  ]);
  const jualAwal = r;
  for (const j of d.penjualan) {
    isiBaris(
      ws,
      r,
      [j.no, j.pembeli, j.jenis_ikan, j.berat, j.harga, { formula: `D${r}*E${r}` }, "", ""],
      [null, null, null, KG, RP, RP, null, null],
    );
    r++;
  }
  const jualAkhir = r - 1;
  barisTotal(ws, r, "TOTAL PENJUALAN", 3, [
    [4, KG],
    [6, RP],
  ]);
  ws.getCell(r, 4).value = { formula: rentang("D", jualAwal, jualAkhir) };
  ws.getCell(r, 6).value = { formula: rentang("F", jualAwal, jualAkhir) };
  const selTotalJual = `F${r}`;
  r += 2;

  // E. Ringkasan keuangan
  judulSeksi(ws, r++, "E. RINGKASAN KEUANGAN", L);
  const ringkas: [string, string][] = [
    ["Total Pembelian", `=${selTotalBeli}`],
    ["Total Operasional", `=${selTotalBiaya}`],
    ["Total Pengeluaran", `=${selPengeluaran}`],
    ["Total Penjualan", `=${selTotalJual}`],
    ["Laba Bersih", `=${selTotalJual}-${selPengeluaran}`],
  ];

  for (const [label, formula] of ringkas) {
    ws.mergeCells(r, 1, r, 3);
    const l = ws.getCell(r, 1);
    l.value = label;
    l.font = { name: "Calibri", size: 11, bold: label === "Laba Bersih" };
    l.border = tepi();
    const v = ws.getCell(r, 4);
    v.value = { formula: formula.slice(1) };
    v.numFmt = RP;
    v.font = { name: "Calibri", size: 11, bold: true };
    v.alignment = { horizontal: "right" };
    v.border = tepi();
    if (label === "Laba Bersih") {
      for (const c of [l, v])
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BIRU_MUDA } };
    }
    r++;
  }
  r++;

  // F. Stok
  judulSeksi(ws, r++, "F. STOK", L);
  const stok: [string, number, string][] = [
    ["Total Berat Masuk", d.stok.masuk, KG],
    ["Total Berat Keluar", d.stok.keluar, KG],
    ["Sisa Stok", d.stok.sisa, KG],
    ["Nilai Persediaan", d.stok.nilai, RP],
  ];
  for (const [label, nilai, fmt] of stok) {
    ws.mergeCells(r, 1, r, 3);
    const l = ws.getCell(r, 1);
    l.value = label;
    l.font = { name: "Calibri", size: 11 };
    l.border = tepi();
    const v = ws.getCell(r, 4);
    v.value = nilai;
    v.numFmt = fmt;
    v.alignment = { horizontal: "right" };
    v.font = { name: "Calibri", size: 11, bold: true };
    v.border = tepi();
    r++;
  }
  r++;

  ws.mergeCells(r, 1, r, L);
  const f = ws.getCell(r, 1);
  f.value = `Dicetak otomatis oleh ERP ${d.perusahaan} pada ${new Date().toLocaleString("id-ID")}`;
  f.font = { name: "Calibri", size: 9, italic: true, color: { argb: "FF888888" } };

  tambahSheetBukuBesar(wb, {
    perusahaan: d.perusahaan,
    periode: tanggalIndo(d.tanggal),
    pembelian: d.pembelian.map((p) => ({
      tanggal: d.tanggal,
      mitra: p.supplier,
      kg: p.berat,
      harga: p.harga,
    })),
    penjualan: d.penjualan.map((p) => ({
      tanggal: d.tanggal,
      mitra: p.pembeli,
      kg: p.berat,
      harga: p.harga,
    })),
    operasional: { [d.tanggal]: d.biaya.reduce((a, b) => a + b.nominal, 0) },
  });

  const buf = await wb.xlsx.writeBuffer();

  return new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
