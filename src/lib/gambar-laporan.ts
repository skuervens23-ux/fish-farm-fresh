import type { LaporanHarian } from "@/lib/laporan-harian";

const rp = (n: number) => new Intl.NumberFormat("id-ID").format(Math.round(n));
const angka = (n: number) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(n);

export type BarisGambar = {
  nama: string;
  angka: string;
  kode: string;
  nominal: number;
};

/** Satukan pembelian, penjualan, dan biaya operasional menjadi satu daftar laporan. */
export function barisLaporanSatuan(d: LaporanHarian): BarisGambar[] {
  return [
    ...d.pembelian.map((b) => ({
      nama: b.supplier,
      angka: angka(b.berat),
      kode: b.jenis_ikan,
      nominal: b.total,
    })),
    ...d.penjualan.map((j) => ({
      nama: j.pembeli,
      angka: angka(j.berat),
      kode: "jual",
      nominal: j.total,
    })),
    ...d.biaya.map((b) => ({
      nama: b.kategori.toLowerCase(),
      angka: "",
      kode: b.keterangan ? b.keterangan.slice(0, 14) : "",
      nominal: b.nominal,
    })),
  ];
}

/**
 * Gambar laporan harian menjadi satu image (PNG) bergaya buku catatan:
 * semua modal — pembelian, penjualan, dan operasional — menyatu dalam satu daftar.
 */
export function gambarLaporanHarian(d: LaporanHarian): string {
  const baris = barisLaporanSatuan(d);
  const S = 2; // skala retina
  const W = 900;
  const padX = 48;
  const tinggiBaris = 44;
  const atas = 150;
  const H = atas + Math.max(baris.length, 1) * tinggiBaris + 150;

  const canvas = document.createElement("canvas");
  canvas.width = W * S;
  canvas.height = H * S;
  const c = canvas.getContext("2d")!;
  c.scale(S, S);

  // Kertas
  c.fillStyle = "#fdfdf8";
  c.fillRect(0, 0, W, H);

  const tgl = new Date(`${d.tanggal}T00:00:00`);
  const judul = `${tgl.getDate()}.${tgl.getMonth() + 1}.${tgl.getFullYear()}`;

  c.fillStyle = "#1b2430";
  c.textBaseline = "middle";
  c.font = "600 15px Georgia, serif";
  c.textAlign = "left";
  c.fillText(d.perusahaan.toUpperCase(), padX, 44);
  c.font = "13px Georgia, serif";
  c.fillStyle = "#6b7280";
  c.textAlign = "right";
  c.fillText(d.nomor, W - padX, 44);

  c.textAlign = "center";
  c.fillStyle = "#111827";
  c.font = "bold 30px Georgia, serif";
  c.fillText(judul, W / 2, 96);

  const kolNama = padX;
  const kolAngka = 330;
  const kolKode = 470;
  const kolNominal = W - padX;

  let y = atas;
  c.font = "20px Georgia, serif";
  for (const b of baris) {
    // garis buku
    c.strokeStyle = "#c7d2de";
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(padX - 16, y + tinggiBaris / 2);
    c.lineTo(W - padX + 16, y + tinggiBaris / 2);
    c.stroke();

    c.fillStyle = "#111827";
    c.textAlign = "left";
    c.fillText(b.nama, kolNama, y);
    c.textAlign = "center";
    if (b.angka) c.fillText(b.angka, kolAngka, y);
    if (b.kode) c.fillText(b.kode, kolKode, y);
    c.textAlign = "right";
    c.fillText(rp(b.nominal), kolNominal, y);
    y += tinggiBaris;
  }

  if (baris.length === 0) {
    c.fillStyle = "#9ca3af";
    c.textAlign = "center";
    c.fillText("Tidak ada transaksi pada tanggal ini", W / 2, y);
    y += tinggiBaris;
  }

  // Total: garis ganda seperti catatan manual
  const total = baris.reduce((a, b) => a + b.nominal, 0);
  const yGaris = y + 8;
  c.strokeStyle = "#111827";
  c.lineWidth = 2;
  for (const off of [0, 5]) {
    c.beginPath();
    c.moveTo(kolKode, yGaris + off);
    c.lineTo(kolNominal, yGaris + off);
    c.stroke();
  }

  c.fillStyle = "#111827";
  c.font = "bold 22px Georgia, serif";
  c.textAlign = "left";
  c.fillText("TOTAL", kolNama, yGaris + 34);
  c.textAlign = "right";
  c.fillText(rp(total), kolNominal, yGaris + 34);

  c.font = "italic 12px Georgia, serif";
  c.fillStyle = "#9ca3af";
  c.textAlign = "left";
  c.fillText(
    `Dicetak otomatis pada ${new Date().toLocaleString("id-ID")}`,
    kolNama,
    yGaris + 74,
  );

  return canvas.toDataURL("image/png");
}
