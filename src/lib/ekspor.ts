/* eslint-disable @typescript-eslint/no-explicit-any */
export type Lembar = {
  nama: string;
  kolom: string[];
  rows: (string | number)[][];
};

const bersih = (s: string) => s.replace(/[\\/?*[\]:]/g, "-").slice(0, 31);

const BIRU = "FF0B3F96";
const BIRU_MUDA = "FFE8EEF9";
const RP = '"Rp" #,##0;[Red](#,##0);"-"';
const tipis = () => ({ style: "thin" as const, color: { argb: "FFBFC7D5" } });
const kotak = () => ({ top: tipis(), left: tipis(), bottom: tipis(), right: tipis() });
const kolomUang = (nama: string) => /total|nilai|laba|modal|omzet|harga|biaya|rp|kas/i.test(nama);

/** Ekspor beberapa tabel ke satu file Excel rapi (1 sheet per tabel, bergaya laporan manual). */
export async function eksporExcel(lembar: Lembar[], namaFile: string) {
  const ExcelJS: any = ((await import("exceljs")) as any).default ?? (await import("exceljs"));
  const wb = new ExcelJS.Workbook();
  wb.creator = "ERP Bandar Ikan";
  wb.created = new Date();

  for (const l of lembar) {
    const ws = wb.addWorksheet(bersih(l.nama), {
      views: [{ state: "frozen", ySplit: 3, showGridLines: false }],
      pageSetup: {
        paperSize: 9,
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
      },
    });
    const L = Math.max(1, l.kolom.length);

    ws.mergeCells(1, 1, 1, L);
    const t = ws.getCell(1, 1);
    t.value = l.nama.toUpperCase();
    t.font = { name: "Calibri", size: 14, bold: true, color: { argb: BIRU } };
    t.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(1).height = 24;

    ws.mergeCells(2, 1, 2, L);
    const s = ws.getCell(2, 1);
    s.value = `Dicetak ${new Date().toLocaleString("id-ID")}`;
    s.font = { name: "Calibri", size: 9, italic: true, color: { argb: "FF777777" } };
    s.alignment = { horizontal: "center" };

    const head = ws.getRow(3);
    l.kolom.forEach((k, i) => {
      const c = head.getCell(i + 1);
      c.value = k;
      c.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BIRU } };
      c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      c.border = kotak();
    });
    head.height = 24;

    l.rows.forEach((r, j) => {
      const row = ws.getRow(4 + j);
      l.kolom.forEach((k, i) => {
        const c = row.getCell(i + 1);
        const v = r[i];
        c.value = v ?? "";
        c.font = { name: "Calibri", size: 11 };
        c.border = kotak();
        if (typeof v === "number") {
          c.numFmt = kolomUang(k) ? RP : "#,##0.##";
          c.alignment = { horizontal: "right" };
        }
        if (j % 2 === 1)
          c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF6F8FC" } };
      });
    });

    if (l.rows.length) {
      const rTotal = 4 + l.rows.length;
      const rowTotal = ws.getRow(rTotal);
      rowTotal.getCell(1).value = "TOTAL";
      l.kolom.forEach((k, i) => {
        const c = rowTotal.getCell(i + 1);
        c.border = kotak();
        c.font = { name: "Calibri", size: 11, bold: true, color: { argb: BIRU } };
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BIRU_MUDA } };
        if (i > 0 && l.rows.some((r) => typeof r[i] === "number")) {
          const h = ws.getColumn(i + 1).letter;
          c.value = { formula: `SUM(${h}4:${h}${rTotal - 1})` };
          c.numFmt = kolomUang(k) ? RP : "#,##0.##";
          c.alignment = { horizontal: "right" };
        }
      });
      ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: rTotal - 1, column: L } };
    }

    l.kolom.forEach((k, i) => {
      ws.getColumn(i + 1).width = Math.min(
        30,
        Math.max(12, k.length + 4, ...l.rows.map((r) => String(r[i] ?? "").length + 3)),
      );
    });
  }

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = namaFile;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}


/** Ekspor beberapa tabel ke satu file PDF berformat laporan. */
export async function eksporPDF(
  judul: string,
  subjudul: string,
  lembar: Lembar[],
  namaFile: string,
) {
  const [{ jsPDF }, autoTableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableMod.default;

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  doc.setFontSize(16);
  doc.text(judul, 40, 40);
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(subjudul, 40, 58);
  doc.setTextColor(0);

  let y = 80;
  for (const l of lembar) {
    doc.setFontSize(11);
    doc.text(l.nama, 40, y);
    autoTable(doc, {
      head: [l.kolom],
      body: l.rows.length ? l.rows.map((r) => r.map((c) => String(c))) : [["Belum ada data"]],
      startY: y + 8,
      margin: { left: 40, right: 40 },
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [11, 63, 150], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 251] },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 28;
    if (y > doc.internal.pageSize.getHeight() - 90) {
      doc.addPage();
      y = 50;
    }
  }

  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(130);
    doc.text(
      `Halaman ${i} dari ${total} · dibuat ${new Date().toLocaleString("id-ID")}`,
      40,
      doc.internal.pageSize.getHeight() - 20,
    );
  }
  doc.save(namaFile);
}
