import { supabase } from "@/integrations/supabase/client";

/** Baris transaksi mentah untuk workbook Excel. */
export type BarisBeli = {
  tanggal: string;
  supplier: string;
  jenis_ikan: string;
  berat: number;
  box: number;
  harga: number;
  mandor: string;
  keterangan: string;
};

export type BarisJual = {
  tanggal: string;
  pembeli: string;
  jenis_ikan: string;
  berat: number;
  box: number;
  harga: number;
  mandor: string;
  keterangan: string;
};

export type DataLaporan = {
  dari: string;
  sampai: string;
  pembelian: BarisBeli[];
  penjualan: BarisJual[];
  masterIkan: string[];
  masterSupplier: string[];
  masterPembeli: string[];
  masterMandor: string[];
};

const nama = (v: unknown) => (v as { nama?: string } | null)?.nama ?? "—";

/** Ambil data mentah (bukan hasil hitungan) untuk dibangun jadi workbook berformula. */
export async function ambilDataLaporan(dari: string, sampai: string): Promise<DataLaporan> {
  const [beli, jual, profil, ikan] = await Promise.all([
    supabase
      .from("pembelian")
      .select(
        "tanggal, jenis_ikan, jumlah_kg, box, harga_per_kg, catatan, dicatat_oleh, petani:petani_id(nama)",
      )
      .gte("tanggal", dari)
      .lte("tanggal", sampai)
      .neq("status_transaksi", "draft")
      .order("tanggal"),
    supabase
      .from("penjualan")
      .select(
        "tanggal, jenis_ikan, berat_kg, harga_per_kg, catatan, dicatat_oleh, pelanggan:pelanggan_id(nama)",
      )
      .gte("tanggal", dari)
      .lte("tanggal", sampai)
      .neq("status_transaksi", "draft")
      .order("tanggal"),
    supabase.from("profiles").select("id, nama"),
    supabase.from("jenis_ikan").select("nama").eq("is_active", true).order("nama"),
  ]);
  if (beli.error) throw beli.error;
  if (jual.error) throw jual.error;

  const petaNama = new Map<string, string>();
  for (const p of profil.data ?? []) petaNama.set(p.id, p.nama || "Owner");

  const pembelian: BarisBeli[] = (beli.data ?? []).map((r) => ({
    tanggal: r.tanggal,
    supplier: nama(r.petani),
    jenis_ikan: r.jenis_ikan,
    berat: Number(r.jumlah_kg ?? 0),
    box: 1,
    harga: Number(r.harga_per_kg ?? 0),
    mandor: petaNama.get(r.dicatat_oleh) || "Owner",
    keterangan: r.catatan ?? "",
  }));

  const penjualan: BarisJual[] = (jual.data ?? []).map((r) => ({
    tanggal: r.tanggal,
    pembeli: nama(r.pelanggan),
    jenis_ikan: r.jenis_ikan,
    berat: Number(r.berat_kg ?? 0),
    box: 1,
    harga: Number(r.harga_per_kg ?? 0),
    mandor: petaNama.get(r.dicatat_oleh) || "Owner",
    keterangan: r.catatan ?? "",
  }));

  const uniq = (arr: string[]) =>
    Array.from(new Set(arr.filter((v) => v && v !== "—"))).sort((a, b) => a.localeCompare(b));

  return {
    dari,
    sampai,
    pembelian,
    penjualan,
    masterIkan: uniq([
      ...(ikan.data ?? []).map((i) => i.nama),
      ...pembelian.map((p) => p.jenis_ikan),
      ...penjualan.map((p) => p.jenis_ikan),
    ]),
    masterSupplier: uniq(pembelian.map((p) => p.supplier)),
    masterPembeli: uniq(penjualan.map((p) => p.pembeli)),
    masterMandor: uniq([...pembelian.map((p) => p.mandor), ...penjualan.map((p) => p.mandor)]),
  };
}
