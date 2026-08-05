/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Sheet "Buku Besar Harian" bergaya buku catatan manual bandar ikan:
 * satu baris per tanggal, kolom dikelompokkan per mitra (HARGA | KG),
 * total baris memakai rumus Excel aktif, plus saldo berjalan.
 */

export const BIRU_BB = "FF0B3F96";
export const BIRU_MUDA_BB = "FFE8EEF9";
const HIJAU = "FFE9F6EC";
const MERAH = "FFFCEBEB";
const RP = '"Rp" #,##0;[Red](#,##0);"-"';
const KG = '#,##0.00;[Red](#,##0.00);"-"';
const TGL = "dd/mm/yyyy";

const tipis = (argb = "FFBFC7D5") => ({ style: "thin" as const, color: { argb } });
const kotak = () => ({ top: tipis(), left: tipis(), bottom: tipis(), right: tipis() });

function huruf(n: number): string {
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export type BarisBukuBesar = {
  tanggal: string;
  mitra: string;
  kg: number;
  harga: number;
};

export type OpsiBukuBesar = {
  perusahaan: string;
  periode: string;
  pembelian: BarisBukuBesar[];
  penjualan: BarisBukuBesar[];
  /** Total biaya operasional per tanggal (ISO date -> nominal). */
  operasional: Record<string, number>;
  saldoAwal?: number;
};

/** Tambahkan sheet buku besar harian ke workbook ExcelJS. */
export function tambahSheetBukuBesar(wb: any, o: OpsiBukuBesar) {
  const ws = wb.addWorksheet("Buku Besar Harian", {
    views: [{ state: "frozen", xSplit: 1, ySplit: 6, showGridLines: false }],
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.3, right: 0.3, top: 0.5, bottom: 0.4, header: 0.2, footer: 0.2 },
    },
  });

  const uniq = (a: string[]) => Array.from(new Set(a.filter(Boolean))).sort();
  const supplier = uniq(o.pembelian.map((r) => r.mitra));
  const pembeli = uniq(o.penjualan.map((r) => r.mitra));
  const tanggal = uniq([
    ...o.pembelian.map((r) => r.tanggal),
    ...o.penjualan.map((r) => r.tanggal),
    ...Object.keys(o.operasional),
  ]);

  // Layout kolom: A = TGL, lalu supplier (2 kol), TOTAL BELI, pembeli (2 kol), TOTAL JUAL, OPS, LABA, SALDO
  const kolTgl = 1;
  const kolBeliAwal = 2;
  const kolBeliAkhir = kolBeliAwal + supplier.length * 2 - 1;
  const kolTotalBeli = Math.max(kolBeliAkhir, kolBeliAwal - 1) + 1;
  const kolJualAwal = kolTotalBeli + 1;
  const kolJualAkhir = kolJualAwal + pembeli.length * 2 - 1;
  const kolTotalJual = Math.max(kolJualAkhir, kolJualAwal - 1) + 1;
  const kolOps = kolTotalJual + 1;
  const kolLaba = kolOps + 1;
  const kolSaldo = kolLaba + 1;
  const L = kolSaldo;

  /* ---- Judul ---- */
  const tulisJudul = (baris: number, teks: string, style: any) => {
    ws.mergeCells(baris, 1, baris, L);
    const c = ws.getCell(baris, 1);
    c.value = teks;
    c.font = style;
    c.alignment = { horizontal: "center", vertical: "middle" };
  };
  tulisJudul(1, o.perusahaan.toUpperCase(), {
    name: "Calibri",
    size: 16,
    bold: true,
    color: { argb: BIRU_BB },
  });
  tulisJudul(2, "BUKU BESAR HARIAN (PEMBELIAN · PENJUALAN · OPERASIONAL)", {
    name: "Calibri",
    size: 12,
    bold: true,
  });
  tulisJudul(3, o.periode, {
    name: "Calibri",
    size: 10,
    italic: true,
    color: { argb: "FF666666" },
  });
  ws.getRow(1).height = 24;

  /* ---- Header 3 tingkat (baris 4 grup besar, 5 nama mitra, 6 HARGA/KG) ---- */
  const isiHeader = (
    baris: number,
    dari: number,
    sampai: number,
    teks: string,
    warna: string,
    fontWarna = "FFFFFFFF",
  ) => {
    if (sampai < dari) return;
    if (sampai > dari) ws.mergeCells(baris, dari, baris, sampai);
    const c = ws.getCell(baris, dari);
    c.value = teks;
    c.font = { name: "Calibri", size: 10, bold: true, color: { argb: fontWarna } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: warna } };
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    for (let k = dari; k <= sampai; k++) ws.getCell(baris, k).border = kotak();
  };

  ws.mergeCells(4, kolTgl, 6, kolTgl);
  isiHeader(4, kolTgl, kolTgl, "TGL", BIRU_BB);
  ws.getCell(4, kolTgl).alignment = { horizontal: "center", vertical: "middle" };

  if (supplier.length) isiHeader(4, kolBeliAwal, kolBeliAkhir, "PEMBELIAN (SUPPLIER)", BIRU_BB);
  supplier.forEach((s, i) => {
    const a = kolBeliAwal + i * 2;
    isiHeader(5, a, a + 1, s.toUpperCase(), "FF14509E");
    isiHeader(6, a, a, "HARGA", "FF3E6FB8");
    isiHeader(6, a + 1, a + 1, "KG", "FF3E6FB8");
  });
  ws.mergeCells(4, kolTotalBeli, 6, kolTotalBeli);
  isiHeader(4, kolTotalBeli, kolTotalBeli, "TOTAL PEMBELIAN", "FF9E2B2B");

  if (pembeli.length) isiHeader(4, kolJualAwal, kolJualAkhir, "PENJUALAN (PEMBELI)", "FF13703C");
  pembeli.forEach((p, i) => {
    const a = kolJualAwal + i * 2;
    isiHeader(5, a, a + 1, p.toUpperCase(), "FF1B8A4B");
    isiHeader(6, a, a, "HARGA", "FF4CA875");
    isiHeader(6, a + 1, a + 1, "KG", "FF4CA875");
  });
  ws.mergeCells(4, kolTotalJual, 6, kolTotalJual);
  isiHeader(4, kolTotalJual, kolTotalJual, "TOTAL PENJUALAN", "FF13703C");
  ws.mergeCells(4, kolOps, 6, kolOps);
  isiHeader(4, kolOps, kolOps, "OPERASIONAL", "FFB06A11");
  ws.mergeCells(4, kolLaba, 6, kolLaba);
  isiHeader(4, kolLaba, kolLaba, "LABA HARI INI", BIRU_BB);
  ws.mergeCells(4, kolSaldo, 6, kolSaldo);
  isiHeader(4, kolSaldo, kolSaldo, "SALDO BERJALAN", BIRU_BB);
  ws.getRow(4).height = 22;
  ws.getRow(5).height = 20;
  ws.getRow(6).height = 18;

  /* ---- Isi baris per tanggal ---- */
  const petaBeli = new Map<string, { kg: number; total: number }>();
  for (const r of o.pembelian) {
    const k = `${r.tanggal}|${r.mitra}`;
    const p = petaBeli.get(k) ?? { kg: 0, total: 0 };
    p.kg += r.kg;
    p.total += r.kg * r.harga;
    petaBeli.set(k, p);
  }
  const petaJual = new Map<string, { kg: number; total: number }>();
  for (const r of o.penjualan) {
    const k = `${r.tanggal}|${r.mitra}`;
    const p = petaJual.get(k) ?? { kg: 0, total: 0 };
    p.kg += r.kg;
    p.total += r.kg * r.harga;
    petaJual.set(k, p);
  }

  const barisAwal = 7;
  let r = barisAwal;
  for (const t of tanggal) {
    const row = ws.getRow(r);
    const tglSel = row.getCell(kolTgl);
    tglSel.value = new Date(`${t}T00:00:00`);
    tglSel.numFmt = TGL;
    tglSel.alignment = { horizontal: "center" };

    const rumusBeli: string[] = [];
    supplier.forEach((s, i) => {
      const a = kolBeliAwal + i * 2;
      const d = petaBeli.get(`${t}|${s}`);
      const kg = d?.kg ?? 0;
      const harga = kg > 0 ? Math.round((d as any).total / kg) : 0;
      row.getCell(a).value = harga || null;
      row.getCell(a).numFmt = RP;
      row.getCell(a + 1).value = kg || null;
      row.getCell(a + 1).numFmt = KG;
      rumusBeli.push(`${huruf(a)}${r}*${huruf(a + 1)}${r}`);
    });
    const cBeli = row.getCell(kolTotalBeli);
    cBeli.value = rumusBeli.length ? { formula: rumusBeli.join("+") } : 0;
    cBeli.numFmt = RP;

    const rumusJual: string[] = [];
    pembeli.forEach((p, i) => {
      const a = kolJualAwal + i * 2;
      const d = petaJual.get(`${t}|${p}`);
      const kg = d?.kg ?? 0;
      const harga = kg > 0 ? Math.round((d as any).total / kg) : 0;
      row.getCell(a).value = harga || null;
      row.getCell(a).numFmt = RP;
      row.getCell(a + 1).value = kg || null;
      row.getCell(a + 1).numFmt = KG;
      rumusJual.push(`${huruf(a)}${r}*${huruf(a + 1)}${r}`);
    });
    const cJual = row.getCell(kolTotalJual);
    cJual.value = rumusJual.length ? { formula: rumusJual.join("+") } : 0;
    cJual.numFmt = RP;

    const cOps = row.getCell(kolOps);
    cOps.value = o.operasional[t] ?? 0;
    cOps.numFmt = RP;

    const B = huruf(kolTotalBeli);
    const J = huruf(kolTotalJual);
    const O = huruf(kolOps);
    const A = huruf(kolLaba);
    const S = huruf(kolSaldo);
    const cLaba = row.getCell(kolLaba);
    cLaba.value = { formula: `${J}${r}-${B}${r}-${O}${r}` };
    cLaba.numFmt = RP;
    cLaba.font = { name: "Calibri", size: 11, bold: true };
    const cSaldo = row.getCell(kolSaldo);
    cSaldo.value = {
      formula: r === barisAwal ? `${o.saldoAwal ?? 0}+${A}${r}` : `${S}${r - 1}+${A}${r}`,
    };
    cSaldo.numFmt = RP;
    cSaldo.font = { name: "Calibri", size: 11, bold: true };

    for (let k = 1; k <= L; k++) {
      const c = row.getCell(k);
      c.border = kotak();
      if (!c.font) c.font = { name: "Calibri", size: 11 };
      if ((r - barisAwal) % 2 === 1)
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF6F8FC" } };
    }
    row.getCell(kolTotalBeli).fill = { type: "pattern", pattern: "solid", fgColor: { argb: MERAH } };
    row.getCell(kolTotalJual).fill = { type: "pattern", pattern: "solid", fgColor: { argb: HIJAU } };
    r++;
  }
  const barisAkhir = r - 1;

  /* ---- Baris total ---- */
  const rowTotal = ws.getRow(r);
  rowTotal.getCell(kolTgl).value = "TOTAL";
  for (let k = 1; k <= L; k++) {
    const c = rowTotal.getCell(k);
    c.border = kotak();
    c.font = { name: "Calibri", size: 11, bold: true, color: { argb: BIRU_BB } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BIRU_MUDA_BB } };
  }
  const jumlah = (kol: number, fmt: string) => {
    if (barisAkhir < barisAwal) return;
    const h = huruf(kol);
    const c = rowTotal.getCell(kol);
    c.value = { formula: `SUM(${h}${barisAwal}:${h}${barisAkhir})` };
    c.numFmt = fmt;
  };
  supplier.forEach((_, i) => jumlah(kolBeliAwal + i * 2 + 1, KG));
  pembeli.forEach((_, i) => jumlah(kolJualAwal + i * 2 + 1, KG));
  [kolTotalBeli, kolTotalJual, kolOps, kolLaba].forEach((k) => jumlah(k, RP));
  if (barisAkhir >= barisAwal) {
    const c = rowTotal.getCell(kolSaldo);
    c.value = { formula: `${huruf(kolSaldo)}${barisAkhir}` };
    c.numFmt = RP;
  }
  rowTotal.height = 20;

  /* ---- Lebar kolom & filter ---- */
  ws.getColumn(kolTgl).width = 12;
  for (let k = 2; k <= L; k++) ws.getColumn(k).width = k >= kolTotalBeli ? 17 : 12;
  if (barisAkhir >= barisAwal) {
    ws.autoFilter = {
      from: { row: 6, column: 1 },
      to: { row: barisAkhir, column: L },
    };
  }

  const rCatatan = r + 2;
  ws.mergeCells(rCatatan, 1, rCatatan, Math.min(L, 8));
  const cat = ws.getCell(rCatatan, 1);
  cat.value =
    "Catatan: seluruh kolom TOTAL, LABA, dan SALDO memakai rumus Excel aktif — ubah HARGA atau KG maka nilai ikut terhitung ulang.";
  cat.font = { name: "Calibri", size: 9, italic: true, color: { argb: "FF888888" } };

  return ws;
}
