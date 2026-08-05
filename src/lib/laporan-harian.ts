import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type BarisBeliHarian = {
  no: number;
  kode: string;
  supplier: string;
  jenis_ikan: string;
  box: number;
  sisa_kg: number;
  berat: number;
  harga: number;
  total: number;
};

export type BarisJualHarian = {
  no: number;
  kode: string;
  pembeli: string;
  jenis_ikan: string;
  berat: number;
  harga: number;
  total: number;
};

export type BarisBiayaHarian = {
  no: number;
  kode: string;
  kategori: string;
  keterangan: string;
  nominal: number;
};

export type RingkasStok = {
  masuk: number;
  keluar: number;
  sisa: number;
  nilai: number;
};

export type LaporanHarian = {
  tanggal: string;
  nomor: string;
  perusahaan: string;
  alamat: string;
  telepon: string;
  pembelian: BarisBeliHarian[];
  penjualan: BarisJualHarian[];
  biaya: BarisBiayaHarian[];
  stok: RingkasStok;
};

const nm = (v: unknown) => (v as { nama?: string } | null)?.nama ?? "—";
const n = (v: unknown) => Number(v ?? 0);

/** Nomor transaksi harian otomatis: TRX-YYYYMMDD-0001. */
export function nomorTransaksi(tanggal: string, urutan: number): string {
  return `TRX-${tanggal.replaceAll("-", "")}-${String(urutan).padStart(4, "0")}`;
}

/** Tanggal panjang bahasa Indonesia. */
export function tanggalIndo(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Ambil seluruh aktivitas bisnis pada satu tanggal untuk laporan harian. */
export function useLaporanHarian(tanggal: string) {
  return useQuery({
    queryKey: ["laporan-harian", tanggal],
    queryFn: async (): Promise<LaporanHarian> => {
      const [beli, jual, biaya, stok, set] = await Promise.all([
        supabase
          .from("pembelian")
          .select(
            "id, jenis_ikan, box, sisa_kg, jumlah_kg, harga_per_kg, total_harga, created_at, petani:petani_id(nama)",
          )
          .eq("tanggal", tanggal)
          .order("created_at"),
        supabase
          .from("penjualan")
          .select(
            "id, jenis_ikan, berat_kg, harga_per_kg, total_harga, created_at, pelanggan:pelanggan_id(nama)",
          )
          .eq("tanggal", tanggal)
          .order("created_at"),
        supabase
          .from("biaya_operasional")
          .select("id, kategori, keterangan, jumlah, jumlah_balok, harga_per_balok, created_at")
          .eq("tanggal", tanggal)
          .order("created_at"),
        supabase.rpc("stok_ikan"),
        supabase.from("pengaturan").select("key, value"),
      ]);
      if (beli.error) throw beli.error;
      if (jual.error) throw jual.error;
      if (biaya.error) throw biaya.error;

      const cfg = new Map((set.data ?? []).map((r) => [r.key, r.value ?? ""]));
      let urut = 0;
      const kode = () => nomorTransaksi(tanggal, ++urut);

      const pembelian: BarisBeliHarian[] = (beli.data ?? []).map((r, i) => ({
        no: i + 1,
        kode: kode(),
        supplier: nm(r.petani),
        jenis_ikan: r.jenis_ikan,
        box: n(r.box),
        sisa_kg: n(r.sisa_kg),
        berat: n(r.jumlah_kg),
        harga: n(r.harga_per_kg),
        total: n(r.total_harga),
      }));

      const penjualan: BarisJualHarian[] = (jual.data ?? []).map((r, i) => ({
        no: i + 1,
        kode: kode(),
        pembeli: nm(r.pelanggan),
        jenis_ikan: r.jenis_ikan,
        berat: n(r.berat_kg),
        harga: n(r.harga_per_kg),
        total: n(r.total_harga),
      }));

      const biayaRows: BarisBiayaHarian[] = (biaya.data ?? []).map((r, i) => {
        const es = n(r.jumlah_balok) > 0 && n(r.harga_per_balok) > 0;
        return {
          no: i + 1,
          kode: kode(),
          kategori: r.kategori,
          keterangan: es
            ? `${n(r.jumlah_balok)} balok × ${n(r.harga_per_balok).toLocaleString("id-ID")}${r.keterangan ? ` — ${r.keterangan}` : ""}`
            : (r.keterangan ?? ""),
          nominal: es ? n(r.jumlah_balok) * n(r.harga_per_balok) : n(r.jumlah),
        };
      });

      const rowsStok = (stok.data ?? []) as Record<string, unknown>[];
      const sum = (k: string) => rowsStok.reduce((a, r) => a + n(r[k]), 0);

      return {
        tanggal,
        nomor: nomorTransaksi(tanggal, 1),
        perusahaan: cfg.get("nama_perusahaan") || "Bandar Ikan",
        alamat: cfg.get("alamat") || "",
        telepon: cfg.get("telepon") || "",
        pembelian,
        penjualan,
        biaya: biayaRows,
        stok: {
          masuk: sum("kg_masuk"),
          keluar: sum("kg_keluar"),
          sisa: sum("kg_sisa"),
          nilai: sum("nilai_persediaan"),
        },
      };
    },
    staleTime: 15_000,
  });
}
