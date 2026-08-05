import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type LotPembelian = {
  id: string;
  tanggal: string;
  jenis_ikan: string;
  nama_petani: string | null;
  box: number;
  faktor_box: number;
  sisa_kg: number;
  jumlah_kg: number;
  harga_per_kg: number;
  total_harga: number;
  kg_terjual: number;
  kg_sisa: number;
  status_jual: "belum" | "sebagian" | "terjual";
};

/** Daftar transaksi pembelian beserta sisa berat yang belum terjual. */
export function useLotPembelian(hanyaSisa = true) {
  return useQuery({
    queryKey: ["lot-pembelian", hanyaSisa],
    queryFn: async (): Promise<LotPembelian[]> => {
      const { data, error } = await supabase.rpc("pembelian_tersedia", {
        _hanya_sisa: hanyaSisa,
      });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        tanggal: r.tanggal,
        jenis_ikan: r.jenis_ikan,
        nama_petani: r.nama_petani,
        box: Number(r.box ?? 0),
        faktor_box: Number(r.faktor_box ?? 0),
        sisa_kg: Number(r.sisa_kg ?? 0),
        jumlah_kg: Number(r.jumlah_kg ?? 0),
        harga_per_kg: Number(r.harga_per_kg ?? 0),
        total_harga: Number(r.total_harga ?? 0),
        kg_terjual: Number(r.kg_terjual ?? 0),
        kg_sisa: Number(r.kg_sisa ?? 0),
        status_jual: r.status_jual as LotPembelian["status_jual"],
      }));
    },
  });
}

export const LABEL_STATUS_JUAL: Record<LotPembelian["status_jual"], string> = {
  belum: "Belum terjual",
  sebagian: "Terjual sebagian",
  terjual: "Sudah terjual",
};

export const KELAS_STATUS_JUAL: Record<LotPembelian["status_jual"], string> = {
  belum: "bg-muted text-muted-foreground",
  sebagian: "bg-warning/15 text-warning",
  terjual: "bg-success/15 text-success",
};
