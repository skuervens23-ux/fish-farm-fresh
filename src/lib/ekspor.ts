export type Lembar = {
  nama: string;
  kolom: string[];
  rows: (string | number)[][];
};

const bersih = (s: string) => s.replace(/[\\/?*[\]:]/g, "-").slice(0, 31);

/** Ekspor beberapa tabel ke satu file Excel (1 sheet per tabel). */
export async function eksporExcel(lembar: Lembar[], namaFile: string) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  for (const l of lembar) {
    const ws = XLSX.utils.aoa_to_sheet([l.kolom, ...l.rows]);
    ws["!cols"] = l.kolom.map((k, i) => ({
      wch: Math.max(
        k.length + 2,
        ...l.rows.map((r) => String(r[i] ?? "").length + 2),
        10,
      ),
    }));
    XLSX.utils.book_append_sheet(wb, ws, bersih(l.nama));
  }
  XLSX.writeFile(wb, namaFile);
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
