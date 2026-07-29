
export type BarisLaporan = {
  tanggal: string;
  petani: string;
  jenis_ikan: string;
  jumlah_kg: number;
  harga_per_kg: number;
  total_harga: number;
  jumlah_dibayar: number;
  status_bayar: string;
};

const LABEL_STATUS: Record<string, string> = {
  lunas: "Lunas",
  belum: "Belum bayar",
  sebagian: "Sebagian",
};

// Minggu = Senin s/d Minggu. Key = tanggal Senin (YYYY-MM-DD).
export function weekKey(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d.toISOString().slice(0, 10);
}

export function weekRangeLabel(senin: string): string {
  const start = new Date(senin + "T00:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const f = (d: Date) => d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  return `${f(start)} – ${f(end)}`;
}

/** Bangun workbook: 1 sheet ringkasan + 1 sheet per minggu. */
async function buildWorkbookMingguan(XLSX: typeof import("xlsx"), rows: BarisLaporan[]) {
  const wb = XLSX.utils.book_new();
  const grup = new Map<string, BarisLaporan[]>();
  for (const r of rows) {
    const k = weekKey(r.tanggal);
    const list = grup.get(k);
    if (list) list.push(r);
    else grup.set(k, [r]);
  }
  const keys = Array.from(grup.keys()).sort().reverse();

  const ringkasan = keys.map((k) => {
    const items = grup.get(k)!;
    const total = items.reduce((s, r) => s + r.total_harga, 0);
    const bayar = items.reduce((s, r) => s + r.jumlah_dibayar, 0);
    return {
      Minggu: weekRangeLabel(k),
      Transaksi: items.length,
      "Total Kg": +items.reduce((s, r) => s + r.jumlah_kg, 0).toFixed(2),
      "Total Harga": total,
      Dibayar: bayar,
      Hutang: +(total - bayar).toFixed(2),
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ringkasan), "Ringkasan");

  for (const k of keys) {
    const items = grup.get(k)!.slice().sort((a, b) => a.tanggal.localeCompare(b.tanggal));
    const data = items.map((r) => ({
      Tanggal: r.tanggal,
      Petani: r.petani,
      "Jenis Ikan": r.jenis_ikan,
      "Jumlah (kg)": r.jumlah_kg,
      "Harga/kg": r.harga_per_kg,
      "Total Harga": r.total_harga,
      Dibayar: r.jumlah_dibayar,
      "Sisa Hutang": +(r.total_harga - r.jumlah_dibayar).toFixed(2),
      Status: LABEL_STATUS[r.status_bayar] ?? r.status_bayar,
    }));
    data.push({
      Tanggal: "TOTAL",
      Petani: "",
      "Jenis Ikan": "",
      "Jumlah (kg)": +items.reduce((s, r) => s + r.jumlah_kg, 0).toFixed(2),
      "Harga/kg": "" as unknown as number,
      "Total Harga": items.reduce((s, r) => s + r.total_harga, 0),
      Dibayar: items.reduce((s, r) => s + r.jumlah_dibayar, 0),
      "Sisa Hutang": +items.reduce((s, r) => s + (r.total_harga - r.jumlah_dibayar), 0).toFixed(2),
      Status: "",
    });
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, `Minggu ${k}`.slice(0, 31));
  }
  return wb;
}

export async function unduhLaporanMingguan(rows: BarisLaporan[], namaFile?: string) {
  const XLSX = await import("xlsx");
  const wb = await buildWorkbookMingguan(XLSX, rows);
  const nama = namaFile ?? `Laporan-Pembelian-${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, nama);
}
