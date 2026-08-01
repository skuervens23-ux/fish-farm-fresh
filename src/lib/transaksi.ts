import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { StatusBayar, StatusTransaksi } from "@/lib/status";

export type Transaksi = {
  id: string;
  jenis: "pembelian" | "penjualan";
  tanggal: string;
  created_at: string;
  jenis_ikan: string;
  pihak: string;
  total: number;
  dibayar: number;
  status_bayar: StatusBayar;
  status_transaksi: StatusTransaksi;
  dicatat_oleh: string;
};

export function useTransaksi() {
  return useQuery({
    queryKey: ["transaksi"],
    queryFn: async (): Promise<Transaksi[]> => {
      const [beli, jual] = await Promise.all([
        supabase
          .from("pembelian")
          .select(
            "id, tanggal, created_at, jenis_ikan, total_harga, jumlah_dibayar, status_bayar, status_transaksi, dicatat_oleh, petani:petani_id(nama)",
          )
          .order("created_at", { ascending: false })
          .limit(300),
        supabase
          .from("penjualan")
          .select(
            "id, tanggal, created_at, jenis_ikan, total_harga, jumlah_dibayar, status_bayar, status_transaksi, dicatat_oleh, pelanggan:pelanggan_id(nama)",
          )
          .order("created_at", { ascending: false })
          .limit(300),
      ]);
      if (beli.error) throw beli.error;
      if (jual.error) throw jual.error;

      const rows: Transaksi[] = [
        ...(beli.data ?? []).map((p) => ({
          id: p.id,
          jenis: "pembelian" as const,
          tanggal: p.tanggal,
          created_at: p.created_at,
          jenis_ikan: p.jenis_ikan,
          pihak: (p.petani as { nama: string } | null)?.nama ?? "—",
          total: Number(p.total_harga ?? 0),
          dibayar: Number(p.jumlah_dibayar ?? 0),
          status_bayar: p.status_bayar as StatusBayar,
          status_transaksi: p.status_transaksi as StatusTransaksi,
          dicatat_oleh: p.dicatat_oleh,
        })),
        ...(jual.data ?? []).map((p) => ({
          id: p.id,
          jenis: "penjualan" as const,
          tanggal: p.tanggal,
          created_at: p.created_at,
          jenis_ikan: p.jenis_ikan,
          pihak: (p.pelanggan as { nama: string } | null)?.nama ?? "—",
          total: Number(p.total_harga ?? 0),
          dibayar: Number(p.jumlah_dibayar ?? 0),
          status_bayar: p.status_bayar as StatusBayar,
          status_transaksi: p.status_transaksi as StatusTransaksi,
          dicatat_oleh: p.dicatat_oleh,
        })),
      ];
      return rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
    },
  });
}

export async function tinjauTransaksi(
  jenis: "pembelian" | "penjualan",
  id: string,
  keputusan: "disetujui" | "ditolak",
  alasan?: string,
) {
  const { data: user } = await supabase.auth.getUser();
  const patch = {
    status_transaksi: keputusan,
    alasan_tolak: keputusan === "ditolak" ? (alasan ?? null) : null,
    ditinjau_oleh: user.user?.id ?? null,
    ditinjau_pada: new Date().toISOString(),
  };
  const { error } =
    jenis === "pembelian"
      ? await supabase.from("pembelian").update(patch).eq("id", id)
      : await supabase.from("penjualan").update(patch).eq("id", id);
  if (error) throw error;
}
