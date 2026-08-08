export function formatRupiah(n: number): string {
  if (!isFinite(n)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

export function formatKg(n: number): string {
  return `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(n)} kg`;
}

/** Tampilkan berat dalam bentuk "3 box 20 kg". */
export function formatBoxKg(box: number, sisaKg: number): string {
  const b = Number(box) || 0;
  const s = Number(sisaKg) || 0;
  const angka = (n: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(n);
  if (b > 0 && s > 0) return `${angka(b)} box ${angka(s)} kg`;
  if (b > 0) return `${angka(b)} box`;
  return `${angka(s)} kg`;
}


export function formatTanggal(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}
