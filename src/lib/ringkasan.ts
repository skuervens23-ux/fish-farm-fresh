import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Ringkasan = {
  beli_hari_ini: number;
  jual_hari_ini: number;
  laba_hari_ini: number;
  saldo_kas: number;
  hutang: number;
  piutang: number;
  jml_menunggu: number;
  jml_belum_lunas: number;
};

const KOSONG: Ringkasan = {
  beli_hari_ini: 0,
  jual_hari_ini: 0,
  laba_hari_ini: 0,
  saldo_kas: 0,
  hutang: 0,
  piutang: 0,
  jml_menunggu: 0,
  jml_belum_lunas: 0,
};

/**
 * Ringkasan dashboard dihitung di database, sehingga tetap akurat
 * walau jumlah transaksi sudah puluhan ribu baris.
 */
export function useRingkasan() {
  return useQuery({
    queryKey: ["ringkasan-dashboard"],
    queryFn: async (): Promise<Ringkasan> => {
      const { data, error } = await supabase.rpc("ringkasan_dashboard");
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : null;
      if (!row) return KOSONG;
      return {
        beli_hari_ini: Number(row.beli_hari_ini ?? 0),
        jual_hari_ini: Number(row.jual_hari_ini ?? 0),
        laba_hari_ini: Number(row.laba_hari_ini ?? 0),
        saldo_kas: Number(row.saldo_kas ?? 0),
        hutang: Number(row.hutang ?? 0),
        piutang: Number(row.piutang ?? 0),
        jml_menunggu: Number(row.jml_menunggu ?? 0),
        jml_belum_lunas: Number(row.jml_belum_lunas ?? 0),
      };
    },
    staleTime: 30_000,
  });
}
