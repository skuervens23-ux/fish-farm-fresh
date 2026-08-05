import type { DataLaporan } from "@/lib/ekspor-excel";
import { tambahSheetBukuBesar } from "@/lib/buku-besar-excel";

/* eslint-disable @typescript-eslint/no-explicit-any */

const BIRU = "FF0B3F96";
const BIRU_MUDA = "FFE8EEF9";
const ABU = "FFF5F7FB";
const RP = '"Rp" #,##0;[Red]-"Rp" #,##0';
const KG = '0.00" Kg"';
const BOX = '0" Box"';
const TGL = "dd/mm/yyyy";

const tanggalKe = (s: string) => new Date(`${s}T00:00:00`);
const uniqSort = (a: string[]) => Array.from(new Set(a)).sort();

function judul(ws: any, teks: string, sub: string, lebarKolom: number) {
  ws.mergeCells(1, 1, 1, lebarKolom);
  ws.mergeCells(2, 1, 2, lebarKolom);
  const t = ws.getCell(1, 1);
  t.value = teks;
  t.font = { name: "Calibri", size: 16, bold: true, color: { argb: BIRU } };
  const s = ws.getCell(2, 1);
  s.value = sub;
  s.font = { name: "Calibri", size: 10, italic: true, color: { argb: "FF666666" } };
  ws.getRow(1).height = 24;
}

function headerTabel(ws: any, baris: number, kolom: string[]) {
  const row = ws.getRow(baris);
  kolom.forEach((k, i) => {
    const c = row.getCell(i + 1);
    c.value = k;
    c.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BIRU } };
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    c.border = garis();
  });
  row.height = 26;
}

function garis() {
  const s = { style: "thin" as const, color: { argb: "FFBFC8DA" } };
  return { top: s, left: s, bottom: s, right: s };
}

function rapikan(ws: any, dariBaris: number, sampaiBaris: number, jmlKolom: number) {
  for (let r = dariBaris; r <= sampaiBaris; r++) {
    const row = ws.getRow(r);
    for (let c = 1; c <= jmlKolom; c++) {
      const cell = row.getCell(c);
      cell.border = garis();
      cell.font = { name: "Calibri", size: 11 };
      if (r % 2 === 0) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ABU } };
    }
  }
}

function autoLebar(ws: any, min = 10, max = 26) {
  ws.columns.forEach((col: any) => {
    let lebar = min;
    col.eachCell?.({ includeEmpty: false }, (cell: any) => {
      const v = cell.value;
      const teks =
        v && typeof v === "object" && "formula" in v ? "Rp 000.000.000" : String(v ?? "");
      lebar = Math.max(lebar, Math.min(max, teks.length + 3));
    });
    col.width = lebar;
  });
}

function bar(ws: any, ref: string, warna: string) {
  ws.addConditionalFormatting({
    ref,
    rules: [
      {
        type: "dataBar",
        priority: 1,
        minLength: 0,
        maxLength: 100,
        gradient: true,
        color: { argb: warna },
        cfvo: [{ type: "min" }, { type: "max" }],
      } as any,
    ],
  });
}

/** Bangun workbook Excel penuh formula (bukan angka hasil aplikasi). */
export async function buatWorkbookLaporan(d: DataLaporan): Promise<Blob> {
  const ExcelJS: any = ((await import("exceljs")) as any).default ?? (await import("exceljs"));
  const wb = new ExcelJS.Workbook();
  wb.creator = "Admin Bandar Ikan";
  wb.created = new Date();
  wb.calcProperties = { fullCalcOnLoad: true };

  const periode = `Periode ${d.dari} s/d ${d.sampai}`;
  const wsDash = wb.addWorksheet("Dashboard", { views: [{ showGridLines: false }] });
  const wsBeli = wb.addWorksheet("Pembelian");
  const wsJual = wb.addWorksheet("Penjualan");
  const wsLaba = wb.addWorksheet("Laba Rugi");
  const wsHari = wb.addWorksheet("Rekap Harian");
  const wsBulan = wb.addWorksheet("Rekap Bulanan");
  const wsTahun = wb.addWorksheet("Rekap Tahunan");
  const wsMaster = wb.addWorksheet("Master", { state: "visible" });

  /* ---------- Master (sumber dropdown) ---------- */
  headerTabel(wsMaster, 1, ["Jenis Ikan", "Supplier", "Pembeli", "Mandor"]);
  const kolomMaster = [d.masterIkan, d.masterSupplier, d.masterPembeli, d.masterMandor];
  const maxMaster = Math.max(1, ...kolomMaster.map((k) => k.length));
  kolomMaster.forEach((list, i) => {
    list.forEach((v, j) => {
      wsMaster.getCell(j + 2, i + 1).value = v;
    });
  });
  rapikan(wsMaster, 2, maxMaster + 1, 4);
  autoLebar(wsMaster);
  const rentangMaster = (kol: string) => `Master!$${kol}$2:$${kol}$${maxMaster + 200}`;

  /* ---------- Pembelian ---------- */
  const HB = [
    "No",
    "Tanggal",
    "Nama Supplier",
    "Jenis Ikan",
    "Berat (Kg)",
    "Jumlah Box",
    "Harga per Box",
    "Total Pembelian",
    "Mandor",
    "Keterangan",
  ];
  judul(wsBeli, "LAPORAN PEMBELIAN IKAN", periode, HB.length);
  headerTabel(wsBeli, 4, HB);
  const awalB = 5;
  d.pembelian.forEach((r, i) => {
    const b = awalB + i;
    const row = wsBeli.getRow(b);
    row.getCell(1).value = { formula: `ROW()-${awalB - 1}` };
    row.getCell(2).value = tanggalKe(r.tanggal);
    row.getCell(3).value = r.supplier;
    row.getCell(4).value = r.jenis_ikan;
    row.getCell(5).value = r.berat;
    row.getCell(6).value = r.box;
    row.getCell(7).value = r.harga;
    row.getCell(8).value = { formula: `E${b}*F${b}*G${b}` };
    row.getCell(9).value = r.mandor;
    row.getCell(10).value = r.keterangan;
  });
  const akhirB = Math.max(awalB, awalB + d.pembelian.length - 1);
  const totalB = akhirB + 1;
  wsBeli.getCell(totalB, 4).value = "TOTAL";
  wsBeli.getCell(totalB, 5).value = { formula: `SUBTOTAL(109,E${awalB}:E${akhirB})` };
  wsBeli.getCell(totalB, 6).value = { formula: `SUBTOTAL(109,F${awalB}:F${akhirB})` };
  wsBeli.getCell(totalB, 7).value = { formula: `ROUND(AVERAGE(G${awalB}:G${akhirB}),0)` };
  wsBeli.getCell(totalB, 8).value = { formula: `SUBTOTAL(109,H${awalB}:H${akhirB})` };
  rapikan(wsBeli, awalB, totalB, HB.length);
  for (let r = awalB; r <= totalB; r++) {
    wsBeli.getCell(r, 2).numFmt = TGL;
    wsBeli.getCell(r, 5).numFmt = KG;
    wsBeli.getCell(r, 6).numFmt = BOX;
    wsBeli.getCell(r, 7).numFmt = RP;
    wsBeli.getCell(r, 8).numFmt = RP;
  }
  for (let c = 1; c <= HB.length; c++) {
    const cell = wsBeli.getCell(totalB, c);
    cell.font = { name: "Calibri", size: 11, bold: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BIRU_MUDA } };
  }
  wsBeli.autoFilter = { from: { row: 4, column: 1 }, to: { row: akhirB, column: HB.length } };
  wsBeli.views = [{ state: "frozen", ySplit: 4 }];
  for (let r = awalB; r <= awalB + Math.max(d.pembelian.length, 50); r++) {
    wsBeli.getCell(r, 3).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`=${rentangMaster("B")}`],
    };
    wsBeli.getCell(r, 4).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`=${rentangMaster("A")}`],
    };
    wsBeli.getCell(r, 9).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`=${rentangMaster("D")}`],
    };
    wsBeli.getCell(r, 2).dataValidation = {
      type: "date",
      operator: "between",
      allowBlank: true,
      showErrorMessage: true,
      formulae: [new Date(2000, 0, 1), new Date(2100, 0, 1)],
      error: "Masukkan tanggal yang valid (dd/mm/yyyy)",
    };
  }
  bar(wsBeli, `H${awalB}:H${akhirB}`, "FF3B82F6");
  autoLebar(wsBeli);

  /* ---------- Penjualan ---------- */
  const HJ = [
    "No",
    "Tanggal",
    "Nama Pembeli",
    "Jenis Ikan",
    "Berat (Kg)",
    "Jumlah Box",
    "Harga Jual per Box",
    "Total Penjualan",
    "Mandor",
    "Keterangan",
  ];
  judul(wsJual, "LAPORAN PENJUALAN IKAN", periode, HJ.length);
  headerTabel(wsJual, 4, HJ);
  const awalJ = 5;
  d.penjualan.forEach((r, i) => {
    const b = awalJ + i;
    const row = wsJual.getRow(b);
    row.getCell(1).value = { formula: `ROW()-${awalJ - 1}` };
    row.getCell(2).value = tanggalKe(r.tanggal);
    row.getCell(3).value = r.pembeli;
    row.getCell(4).value = r.jenis_ikan;
    row.getCell(5).value = r.berat;
    row.getCell(6).value = r.box;
    row.getCell(7).value = r.harga;
    row.getCell(8).value = { formula: `E${b}*F${b}*G${b}` };
    row.getCell(9).value = r.mandor;
    row.getCell(10).value = r.keterangan;
  });
  const akhirJ = Math.max(awalJ, awalJ + d.penjualan.length - 1);
  const totalJ = akhirJ + 1;
  wsJual.getCell(totalJ, 4).value = "TOTAL";
  wsJual.getCell(totalJ, 5).value = { formula: `SUBTOTAL(109,E${awalJ}:E${akhirJ})` };
  wsJual.getCell(totalJ, 6).value = { formula: `SUBTOTAL(109,F${awalJ}:F${akhirJ})` };
  wsJual.getCell(totalJ, 7).value = { formula: `ROUND(AVERAGE(G${awalJ}:G${akhirJ}),0)` };
  wsJual.getCell(totalJ, 8).value = { formula: `SUBTOTAL(109,H${awalJ}:H${akhirJ})` };
  rapikan(wsJual, awalJ, totalJ, HJ.length);
  for (let r = awalJ; r <= totalJ; r++) {
    wsJual.getCell(r, 2).numFmt = TGL;
    wsJual.getCell(r, 5).numFmt = KG;
    wsJual.getCell(r, 6).numFmt = BOX;
    wsJual.getCell(r, 7).numFmt = RP;
    wsJual.getCell(r, 8).numFmt = RP;
  }
  for (let c = 1; c <= HJ.length; c++) {
    const cell = wsJual.getCell(totalJ, c);
    cell.font = { name: "Calibri", size: 11, bold: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BIRU_MUDA } };
  }
  wsJual.autoFilter = { from: { row: 4, column: 1 }, to: { row: akhirJ, column: HJ.length } };
  wsJual.views = [{ state: "frozen", ySplit: 4 }];
  for (let r = awalJ; r <= awalJ + Math.max(d.penjualan.length, 50); r++) {
    wsJual.getCell(r, 3).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`=${rentangMaster("C")}`],
    };
    wsJual.getCell(r, 4).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`=${rentangMaster("A")}`],
    };
    wsJual.getCell(r, 9).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`=${rentangMaster("D")}`],
    };
  }
  bar(wsJual, `H${awalJ}:H${akhirJ}`, "FF16A34A");
  autoLebar(wsJual);

  // Rentang absolut untuk SUMIFS (dilebihkan agar baris baru ikut terhitung)
  const sisa = 500;
  const B = {
    tgl: `Pembelian!$B$${awalB}:$B$${akhirB + sisa}`,
    ikan: `Pembelian!$D$${awalB}:$D$${akhirB + sisa}`,
    berat: `Pembelian!$E$${awalB}:$E$${akhirB + sisa}`,
    box: `Pembelian!$F$${awalB}:$F$${akhirB + sisa}`,
    total: `Pembelian!$H$${awalB}:$H$${akhirB + sisa}`,
    pihak: `Pembelian!$C$${awalB}:$C$${akhirB + sisa}`,
  };
  const J = {
    tgl: `Penjualan!$B$${awalJ}:$B$${akhirJ + sisa}`,
    ikan: `Penjualan!$D$${awalJ}:$D$${akhirJ + sisa}`,
    berat: `Penjualan!$E$${awalJ}:$E$${akhirJ + sisa}`,
    box: `Penjualan!$F$${awalJ}:$F$${akhirJ + sisa}`,
    total: `Penjualan!$H$${awalJ}:$H$${akhirJ + sisa}`,
    pihak: `Penjualan!$C$${awalJ}:$C$${akhirJ + sisa}`,
  };

  /* ---------- Laba Rugi (per tanggal + jenis ikan) ---------- */
  const HL = ["No", "Tanggal", "Jenis Ikan", "Modal", "Penjualan", "Laba", "Rugi"];
  judul(wsLaba, "LAPORAN KEUNTUNGAN", periode, HL.length);
  headerTabel(wsLaba, 4, HL);
  const kombinasi = uniqSort([
    ...d.pembelian.map((r) => `${r.tanggal}|${r.jenis_ikan}`),
    ...d.penjualan.map((r) => `${r.tanggal}|${r.jenis_ikan}`),
  ]);
  const awalL = 5;
  kombinasi.forEach((k, i) => {
    const [tgl, ikan] = k.split("|");
    const b = awalL + i;
    const row = wsLaba.getRow(b);
    row.getCell(1).value = { formula: `ROW()-${awalL - 1}` };
    row.getCell(2).value = tanggalKe(tgl);
    row.getCell(3).value = ikan;
    row.getCell(4).value = { formula: `SUMIFS(${B.total},${B.tgl},B${b},${B.ikan},C${b})` };
    row.getCell(5).value = { formula: `SUMIFS(${J.total},${J.tgl},B${b},${J.ikan},C${b})` };
    row.getCell(6).value = { formula: `IF(E${b}>D${b},E${b}-D${b},0)` };
    row.getCell(7).value = { formula: `IF(D${b}>E${b},D${b}-E${b},0)` };
  });
  const akhirL = Math.max(awalL, awalL + kombinasi.length - 1);
  const totalL = akhirL + 1;
  wsLaba.getCell(totalL, 3).value = "TOTAL";
  ["D", "E", "F", "G"].forEach((c, i) => {
    wsLaba.getCell(totalL, 4 + i).value = { formula: `SUBTOTAL(109,${c}${awalL}:${c}${akhirL})` };
  });
  rapikan(wsLaba, awalL, totalL, HL.length);
  for (let r = awalL; r <= totalL; r++) {
    wsLaba.getCell(r, 2).numFmt = TGL;
    for (let c = 4; c <= 7; c++) wsLaba.getCell(r, c).numFmt = RP;
  }
  for (let c = 1; c <= HL.length; c++) {
    const cell = wsLaba.getCell(totalL, c);
    cell.font = { name: "Calibri", size: 11, bold: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BIRU_MUDA } };
  }
  wsLaba.autoFilter = { from: { row: 4, column: 1 }, to: { row: akhirL, column: HL.length } };
  wsLaba.views = [{ state: "frozen", ySplit: 4 }];
  bar(wsLaba, `F${awalL}:F${akhirL}`, "FF16A34A");
  bar(wsLaba, `G${awalL}:G${akhirL}`, "FFDC2626");
  autoLebar(wsLaba);

  /* ---------- Rekap Harian ---------- */
  const HH = [
    "Tanggal",
    "Total Pembelian",
    "Total Penjualan",
    "Total Berat (Kg)",
    "Total Box",
    "Keuntungan",
    "Kerugian",
  ];
  judul(wsHari, "REKAP HARIAN", periode, HH.length);
  headerTabel(wsHari, 4, HH);
  const tanggalUnik = uniqSort([
    ...d.pembelian.map((r) => r.tanggal),
    ...d.penjualan.map((r) => r.tanggal),
  ]);
  const awalH = 5;
  tanggalUnik.forEach((t, i) => {
    const b = awalH + i;
    const row = wsHari.getRow(b);
    row.getCell(1).value = tanggalKe(t);
    row.getCell(2).value = { formula: `SUMIFS(${B.total},${B.tgl},A${b})` };
    row.getCell(3).value = { formula: `SUMIFS(${J.total},${J.tgl},A${b})` };
    row.getCell(4).value = {
      formula: `SUMIFS(${B.berat},${B.tgl},A${b})+SUMIFS(${J.berat},${J.tgl},A${b})`,
    };
    row.getCell(5).value = {
      formula: `SUMIFS(${B.box},${B.tgl},A${b})+SUMIFS(${J.box},${J.tgl},A${b})`,
    };
    row.getCell(6).value = { formula: `IF(C${b}>B${b},C${b}-B${b},0)` };
    row.getCell(7).value = { formula: `IF(B${b}>C${b},B${b}-C${b},0)` };
  });
  const akhirH = Math.max(awalH, awalH + tanggalUnik.length - 1);
  const totalH = akhirH + 1;
  wsHari.getCell(totalH, 1).value = "TOTAL";
  ["B", "C", "D", "E", "F", "G"].forEach((c, i) => {
    wsHari.getCell(totalH, 2 + i).value = { formula: `SUBTOTAL(109,${c}${awalH}:${c}${akhirH})` };
  });
  rapikan(wsHari, awalH, totalH, HH.length);
  for (let r = awalH; r <= totalH; r++) {
    wsHari.getCell(r, 1).numFmt = TGL;
    wsHari.getCell(r, 2).numFmt = RP;
    wsHari.getCell(r, 3).numFmt = RP;
    wsHari.getCell(r, 4).numFmt = KG;
    wsHari.getCell(r, 5).numFmt = BOX;
    wsHari.getCell(r, 6).numFmt = RP;
    wsHari.getCell(r, 7).numFmt = RP;
  }
  for (let c = 1; c <= HH.length; c++) {
    const cell = wsHari.getCell(totalH, c);
    cell.font = { name: "Calibri", size: 11, bold: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BIRU_MUDA } };
  }
  wsHari.autoFilter = { from: { row: 4, column: 1 }, to: { row: akhirH, column: HH.length } };
  wsHari.views = [{ state: "frozen", ySplit: 4 }];
  bar(wsHari, `B${awalH}:B${akhirH}`, "FF3B82F6");
  bar(wsHari, `C${awalH}:C${akhirH}`, "FF16A34A");
  autoLebar(wsHari);

  /* ---------- Rekap Bulanan ---------- */
  const HM = [
    "Bulan",
    "Mulai",
    "Selesai",
    "Total Pembelian",
    "Total Penjualan",
    "Total Berat (Kg)",
    "Total Box",
    "Keuntungan",
    "Kerugian",
    "Rata-rata Harian",
  ];
  judul(wsBulan, "REKAP BULANAN", periode, HM.length);
  headerTabel(wsBulan, 4, HM);
  const bulanUnik = uniqSort(tanggalUnik.map((t) => t.slice(0, 7)));
  const awalM = 5;
  bulanUnik.forEach((m, i) => {
    const b = awalM + i;
    const [y, mo] = m.split("-").map(Number);
    const mulai = new Date(y, mo - 1, 1);
    const selesai = new Date(y, mo, 0);
    const row = wsBulan.getRow(b);
    row.getCell(1).value = { formula: `TEXT(B${b},"mmmm yyyy")` };
    row.getCell(2).value = mulai;
    row.getCell(3).value = selesai;
    row.getCell(4).value = {
      formula: `SUMIFS(${B.total},${B.tgl},">="&B${b},${B.tgl},"<="&C${b})`,
    };
    row.getCell(5).value = {
      formula: `SUMIFS(${J.total},${J.tgl},">="&B${b},${J.tgl},"<="&C${b})`,
    };
    row.getCell(6).value = {
      formula: `SUMIFS(${B.berat},${B.tgl},">="&B${b},${B.tgl},"<="&C${b})+SUMIFS(${J.berat},${J.tgl},">="&B${b},${J.tgl},"<="&C${b})`,
    };
    row.getCell(7).value = {
      formula: `SUMIFS(${B.box},${B.tgl},">="&B${b},${B.tgl},"<="&C${b})+SUMIFS(${J.box},${J.tgl},">="&B${b},${J.tgl},"<="&C${b})`,
    };
    row.getCell(8).value = { formula: `IF(E${b}>D${b},E${b}-D${b},0)` };
    row.getCell(9).value = { formula: `IF(D${b}>E${b},D${b}-E${b},0)` };
    row.getCell(10).value = { formula: `ROUND(E${b}/MAX(1,C${b}-B${b}+1),0)` };
  });
  const akhirM = Math.max(awalM, awalM + bulanUnik.length - 1);
  rapikan(wsBulan, awalM, akhirM, HM.length);
  for (let r = awalM; r <= akhirM; r++) {
    wsBulan.getCell(r, 2).numFmt = TGL;
    wsBulan.getCell(r, 3).numFmt = TGL;
    [4, 5, 8, 9, 10].forEach((c) => (wsBulan.getCell(r, c).numFmt = RP));
    wsBulan.getCell(r, 6).numFmt = KG;
    wsBulan.getCell(r, 7).numFmt = BOX;
  }
  wsBulan.views = [{ state: "frozen", ySplit: 4 }];
  wsBulan.autoFilter = { from: { row: 4, column: 1 }, to: { row: akhirM, column: HM.length } };
  bar(wsBulan, `D${awalM}:D${akhirM}`, "FF3B82F6");
  bar(wsBulan, `E${awalM}:E${akhirM}`, "FF16A34A");
  autoLebar(wsBulan);

  /* ---------- Rekap Tahunan ---------- */
  const HT = [
    "Tahun",
    "Mulai",
    "Selesai",
    "Jumlah Transaksi Beli",
    "Jumlah Transaksi Jual",
    "Total Pembelian",
    "Total Penjualan",
    "Total Berat (Kg)",
    "Keuntungan",
    "Kerugian",
  ];
  judul(wsTahun, "REKAP TAHUNAN", periode, HT.length);
  headerTabel(wsTahun, 4, HT);
  const tahunUnik = uniqSort(tanggalUnik.map((t) => t.slice(0, 4)));
  const awalY = 5;
  tahunUnik.forEach((y, i) => {
    const b = awalY + i;
    const row = wsTahun.getRow(b);
    row.getCell(1).value = Number(y);
    row.getCell(2).value = new Date(Number(y), 0, 1);
    row.getCell(3).value = new Date(Number(y), 11, 31);
    row.getCell(4).value = {
      formula: `COUNTIFS(${B.tgl},">="&B${b},${B.tgl},"<="&C${b})`,
    };
    row.getCell(5).value = {
      formula: `COUNTIFS(${J.tgl},">="&B${b},${J.tgl},"<="&C${b})`,
    };
    row.getCell(6).value = {
      formula: `SUMIFS(${B.total},${B.tgl},">="&B${b},${B.tgl},"<="&C${b})`,
    };
    row.getCell(7).value = {
      formula: `SUMIFS(${J.total},${J.tgl},">="&B${b},${J.tgl},"<="&C${b})`,
    };
    row.getCell(8).value = {
      formula: `SUMIFS(${B.berat},${B.tgl},">="&B${b},${B.tgl},"<="&C${b})+SUMIFS(${J.berat},${J.tgl},">="&B${b},${J.tgl},"<="&C${b})`,
    };
    row.getCell(9).value = { formula: `IF(G${b}>F${b},G${b}-F${b},0)` };
    row.getCell(10).value = { formula: `IF(F${b}>G${b},F${b}-G${b},0)` };
  });
  const akhirY = Math.max(awalY, awalY + tahunUnik.length - 1);
  rapikan(wsTahun, awalY, akhirY, HT.length);
  for (let r = awalY; r <= akhirY; r++) {
    wsTahun.getCell(r, 1).numFmt = "0";
    wsTahun.getCell(r, 2).numFmt = TGL;
    wsTahun.getCell(r, 3).numFmt = TGL;
    [6, 7, 9, 10].forEach((c) => (wsTahun.getCell(r, c).numFmt = RP));
    wsTahun.getCell(r, 8).numFmt = KG;
  }
  wsTahun.views = [{ state: "frozen", ySplit: 4 }];
  autoLebar(wsTahun);

  /* ---------- Dashboard ---------- */
  judul(wsDash, "DASHBOARD LAPORAN BANDAR IKAN", periode, 6);
  const ringkas: [string, string, string][] = [
    ["Jumlah Transaksi Pembelian", `COUNTIF(${B.tgl},">0")`, "0"],
    ["Jumlah Transaksi Penjualan", `COUNTIF(${J.tgl},">0")`, "0"],
    ["Total Pembelian (Modal)", `SUM(${B.total})`, RP],
    ["Total Penjualan (Omzet)", `SUM(${J.total})`, RP],
    ["Total Berat", `SUM(${B.berat})+SUM(${J.berat})`, KG],
    ["Total Box", `SUM(${B.box})+SUM(${J.box})`, BOX],
    ["Keuntungan", `IF(SUM(${J.total})>SUM(${B.total}),SUM(${J.total})-SUM(${B.total}),0)`, RP],
    ["Kerugian", `IF(SUM(${B.total})>SUM(${J.total}),SUM(${B.total})-SUM(${J.total}),0)`, RP],
    [
      "Margin (%)",
      `IF(SUM(${B.total})=0,0,ROUND((SUM(${J.total})-SUM(${B.total}))/SUM(${B.total}),4))`,
      "0.00%",
    ],
    ["Penjualan Tertinggi (harian)", `MAX('Rekap Harian'!C${awalH}:C${akhirH})`, RP],
    ["Penjualan Terendah (harian)", `MIN('Rekap Harian'!C${awalH}:C${akhirH})`, RP],
    ["Rata-rata Penjualan Harian", `ROUND(AVERAGE('Rekap Harian'!C${awalH}:C${akhirH}),0)`, RP],
  ];
  headerTabel(wsDash, 4, ["Ringkasan", "Nilai"]);
  ringkas.forEach(([label, rumus, fmt], i) => {
    const b = 5 + i;
    wsDash.getCell(b, 1).value = label;
    const c = wsDash.getCell(b, 2);
    c.value = { formula: rumus };
    c.numFmt = fmt;
    c.font = { name: "Calibri", size: 11, bold: true };
  });
  rapikan(wsDash, 5, 4 + ringkas.length, 2);

  // Tabel grafik (data bar) — otomatis mengikuti data
  let baris = 6 + ringkas.length;
  const blok = (
    tajuk: string,
    daftar: string[],
    rentangKriteria: string,
    rentangNilai: string,
    warna: string,
  ) => {
    wsDash.mergeCells(baris, 1, baris, 2);
    const t = wsDash.getCell(baris, 1);
    t.value = tajuk;
    t.font = { name: "Calibri", size: 12, bold: true, color: { argb: BIRU } };
    headerTabel(wsDash, baris + 1, ["Nama", "Nilai"]);
    const mulai = baris + 2;
    daftar.forEach((n, i) => {
      wsDash.getCell(mulai + i, 1).value = n;
      const c = wsDash.getCell(mulai + i, 2);
      c.value = { formula: `SUMIFS(${rentangNilai},${rentangKriteria},A${mulai + i})` };
      c.numFmt = RP;
    });
    const akhir = Math.max(mulai, mulai + daftar.length - 1);
    rapikan(wsDash, mulai, akhir, 2);
    bar(wsDash, `B${mulai}:B${akhir}`, warna);
    baris = akhir + 3;
  };
  blok("GRAFIK JENIS IKAN TERLARIS", d.masterIkan, J.ikan, J.total, "FF16A34A");
  blok("GRAFIK SUPPLIER TERBESAR", d.masterSupplier, B.pihak, B.total, "FF3B82F6");
  blok("GRAFIK PEMBELI TERBESAR", d.masterPembeli, J.pihak, J.total, "FF9333EA");

  wsDash.mergeCells(baris, 1, baris, 2);
  const catatan = wsDash.getCell(baris, 1);
  catatan.value =
    "Catatan: seluruh angka memakai formula Excel aktif. Untuk grafik batang/garis penuh, blok tabel di atas lalu Insert > Chart.";
  catatan.font = { name: "Calibri", size: 9, italic: true, color: { argb: "FF666666" } };
  wsDash.getColumn(1).width = 34;
  wsDash.getColumn(2).width = 24;
  wsDash.views = [{ state: "frozen", ySplit: 4, showGridLines: false }];

  tambahSheetBukuBesar(wb, {
    perusahaan: "Bandar Ikan",
    periode: `Periode ${d.dari} s/d ${d.sampai}`,
    pembelian: d.pembelian.map((p) => ({
      tanggal: p.tanggal,
      mitra: p.supplier,
      kg: p.berat,
      harga: p.harga,
    })),
    penjualan: d.penjualan.map((p) => ({
      tanggal: p.tanggal,
      mitra: p.pembeli,
      kg: p.berat,
      harga: p.harga,
    })),
    operasional: {},
  });

  const buf = await wb.xlsx.writeBuffer();

  return new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function unduhBlob(blob: Blob, namaFile: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = namaFile;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
