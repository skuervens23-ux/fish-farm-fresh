import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Periode = "hari" | "minggu" | "bulan" | "tahun";

export type RentangTanggal = { dari: string; sampai: string };

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Rentang tanggal siap pakai untuk filter analisis. */
export function rentang(preset: "7h" | "30h" | "bulan-ini" | "tahun-ini"): RentangTanggal {
  const now = new Date();
  const sampai = iso(now);
  if (preset === "7h") {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    return { dari: iso(d), sampai };
  }
  if (preset === "30h") {
    const d = new Date(now);
    d.setDate(d.getDate() - 29);
    return { dari: iso(d), sampai };
  }
  if (preset === "bulan-ini") {
    return { dari: iso(new Date(now.getFullYear(), now.getMonth(), 1)), sampai };
  }
  return { dari: iso(new Date(now.getFullYear(), 0, 1)), sampai };
}

export type RingkasanPeriode = {
  omzet_hari_ini: number;
  modal_hari_ini: number;
  laba_hari_ini: number;
  total_modal: number;
  total_penjualan: number;
  total_biaya: number;
  laba_kotor: number;
  laba_bersih: number;
  margin: number;
  saldo_kas: number;
  hutang: number;
  piutang: number;
  jml_belum_lunas: number;
};

const num = (v: unknown) => Number(v ?? 0);

export function useRingkasanPeriode(r: RentangTanggal) {
  return useQuery({
    queryKey: ["analitik", "ringkasan", r.dari, r.sampai],
    queryFn: async (): Promise<RingkasanPeriode> => {
      const { data, error } = await supabase.rpc("ringkasan_periode", {
        _dari: r.dari,
        _sampai: r.sampai,
      });
      if (error) throw error;
      const row = (Array.isArray(data) ? data[0] : null) as Record<string, unknown> | null;
      const keys: (keyof RingkasanPeriode)[] = [
        "omzet_hari_ini",
        "modal_hari_ini",
        "laba_hari_ini",
        "total_modal",
        "total_penjualan",
        "total_biaya",
        "laba_kotor",
        "laba_bersih",
        "margin",
        "saldo_kas",
        "hutang",
        "piutang",
        "jml_belum_lunas",
      ];
      const out = {} as RingkasanPeriode;
      for (const k of keys) out[k] = num(row?.[k]);
      return out;
    },
    staleTime: 30_000,
  });
}

export type TitikSeri = {
  periode: string;
  modal: number;
  penjualan: number;
  biaya: number;
  laba_kotor: number;
  laba_bersih: number;
  margin: number;
};

export function useProfitSeries(r: RentangTanggal, grup: Periode = "hari") {
  return useQuery({
    queryKey: ["analitik", "series", r.dari, r.sampai, grup],
    queryFn: async (): Promise<TitikSeri[]> => {
      const { data, error } = await supabase.rpc("profit_series", {
        _dari: r.dari,
        _sampai: r.sampai,
        _grup: grup,
      });
      if (error) throw error;
      return ((data ?? []) as Record<string, unknown>[]).map((d) => ({
        periode: String(d.periode ?? ""),
        modal: num(d.modal),
        penjualan: num(d.penjualan),
        biaya: num(d.biaya),
        laba_kotor: num(d.laba_kotor),
        laba_bersih: num(d.laba_bersih),
        margin: num(d.margin),
      }));
    },
    staleTime: 30_000,
  });
}

export type BarisSupplier = {
  nama: string;
  transaksi: number;
  total_kg: number;
  modal: number;
  hutang: number;
};

export function useProfitSupplier(r: RentangTanggal) {
  return useQuery({
    queryKey: ["analitik", "supplier", r.dari, r.sampai],
    queryFn: async (): Promise<BarisSupplier[]> => {
      const { data, error } = await supabase.rpc("profit_per_supplier", {
        _dari: r.dari,
        _sampai: r.sampai,
      });
      if (error) throw error;
      return ((data ?? []) as Record<string, unknown>[]).map((d) => ({
        nama: String(d.nama ?? "—"),
        transaksi: num(d.transaksi),
        total_kg: num(d.total_kg),
        modal: num(d.modal),
        hutang: num(d.hutang),
      }));
    },
    staleTime: 30_000,
  });
}

export type BarisCustomer = {
  nama: string;
  transaksi: number;
  total_kg: number;
  omzet: number;
  piutang: number;
};

export function useProfitCustomer(r: RentangTanggal) {
  return useQuery({
    queryKey: ["analitik", "customer", r.dari, r.sampai],
    queryFn: async (): Promise<BarisCustomer[]> => {
      const { data, error } = await supabase.rpc("profit_per_customer", {
        _dari: r.dari,
        _sampai: r.sampai,
      });
      if (error) throw error;
      return ((data ?? []) as Record<string, unknown>[]).map((d) => ({
        nama: String(d.nama ?? "—"),
        transaksi: num(d.transaksi),
        total_kg: num(d.total_kg),
        omzet: num(d.omzet),
        piutang: num(d.piutang),
      }));
    },
    staleTime: 30_000,
  });
}

export type BarisIkan = {
  jenis_ikan: string;
  modal: number;
  penjualan: number;
  laba_kotor: number;
  margin: number;
  kg_beli: number;
  kg_jual: number;
};

export function useProfitIkan(r: RentangTanggal) {
  return useQuery({
    queryKey: ["analitik", "ikan", r.dari, r.sampai],
    queryFn: async (): Promise<BarisIkan[]> => {
      const { data, error } = await supabase.rpc("profit_per_ikan", {
        _dari: r.dari,
        _sampai: r.sampai,
      });
      if (error) throw error;
      return ((data ?? []) as Record<string, unknown>[]).map((d) => ({
        jenis_ikan: String(d.jenis_ikan ?? "—"),
        modal: num(d.modal),
        penjualan: num(d.penjualan),
        laba_kotor: num(d.laba_kotor),
        margin: num(d.margin),
        kg_beli: num(d.kg_beli),
        kg_jual: num(d.kg_jual),
      }));
    },
    staleTime: 30_000,
  });
}

export type BarisLot = {
  lot: string;
  kg_beli: number;
  kg_jual: number;
  modal: number;
  penjualan: number;
  biaya: number;
  laba_bersih: number;
  margin: number;
};

export function useProfitLot(r: RentangTanggal) {
  return useQuery({
    queryKey: ["analitik", "lot", r.dari, r.sampai],
    queryFn: async (): Promise<BarisLot[]> => {
      const { data, error } = await supabase.rpc("profit_per_lot", {
        _dari: r.dari,
        _sampai: r.sampai,
      });
      if (error) throw error;
      return ((data ?? []) as Record<string, unknown>[]).map((d) => ({
        lot: String(d.lot ?? ""),
        kg_beli: num(d.kg_beli),
        kg_jual: num(d.kg_jual),
        modal: num(d.modal),
        penjualan: num(d.penjualan),
        biaya: num(d.biaya),
        laba_bersih: num(d.laba_bersih),
        margin: num(d.margin),
      }));
    },
    staleTime: 30_000,
  });
}

export type BarisStok = {
  jenis_ikan: string;
  kg_masuk: number;
  kg_keluar: number;
  kg_sisa: number;
  harga_rata: number;
  nilai_persediaan: number;
};

/** Stok berjalan per jenis ikan (pembelian menambah, penjualan mengurangi). */
export function useStokIkan() {
  return useQuery({
    queryKey: ["stok", "ikan"],
    queryFn: async (): Promise<BarisStok[]> => {
      const { data, error } = await supabase.rpc("stok_ikan");
      if (error) throw error;
      return (data ?? []).map((r: Record<string, unknown>) => ({
        jenis_ikan: String(r["jenis_ikan"] ?? "-"),
        kg_masuk: num(r["kg_masuk"]),
        kg_keluar: num(r["kg_keluar"]),
        kg_sisa: num(r["kg_sisa"]),
        harga_rata: num(r["harga_rata"]),
        nilai_persediaan: num(r["nilai_persediaan"]),
      }));
    },
    staleTime: 30_000,
  });
}

export type RingkasanHariIni = {
  total_pembelian: number;
  total_penjualan: number;
  total_operasional: number;
  laba_bersih: number;
  berat_dibeli: number;
  berat_terjual: number;
  nilai_persediaan: number;
  nilai_modal: number;
};

/** Ringkasan real-time hari ini: Laba Bersih = Penjualan − Pembelian − Operasional. */
export function useRingkasanHariIni(tanggal?: string) {
  return useQuery({
    queryKey: ["analitik", "hari-ini", tanggal ?? "today"],
    queryFn: async (): Promise<RingkasanHariIni> => {
      const { data, error } = await supabase.rpc(
        "ringkasan_hari_ini",
        tanggal ? { _tanggal: tanggal } : {},
      );
      if (error) throw error;
      const row = (Array.isArray(data) ? data[0] : null) as Record<string, unknown> | null;
      return {
        total_pembelian: num(row?.["total_pembelian"]),
        total_penjualan: num(row?.["total_penjualan"]),
        total_operasional: num(row?.["total_operasional"]),
        laba_bersih: num(row?.["laba_bersih"]),
        berat_dibeli: num(row?.["berat_dibeli"]),
        berat_terjual: num(row?.["berat_terjual"]),
        nilai_persediaan: num(row?.["nilai_persediaan"]),
        nilai_modal: num(row?.["nilai_modal"]),
      };
    },
    staleTime: 15_000,
  });
}
