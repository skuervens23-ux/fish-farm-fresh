import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TipeKas = "masuk" | "keluar";

export type BarisKas = {
  id: string;
  tanggal: string;
  tipe: TipeKas;
  kategori: string;
  jumlah: number;
  keterangan: string | null;
  dicatat_oleh: string;
  created_at: string;
};

export const KATEGORI_MASUK = ["penjualan", "modal", "piutang", "lainnya"];
export const KATEGORI_KELUAR = ["pembelian", "operasional", "gaji", "transport", "pakan", "lainnya"];

export function useKas() {
  return useQuery({
    queryKey: ["kas"],
    queryFn: async (): Promise<BarisKas[]> => {
      const { data, error } = await supabase
        .from("kas")
        .select("id, tanggal, tipe, kategori, jumlah, keterangan, dicatat_oleh, created_at")
        .order("tanggal", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []).map((r) => ({ ...r, jumlah: Number(r.jumlah) })) as BarisKas[];
    },
  });
}

export async function tambahKas(input: {
  tanggal: string;
  tipe: TipeKas;
  kategori: string;
  jumlah: number;
  keterangan?: string;
}) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Belum login");
  const { error } = await supabase.from("kas").insert({
    tanggal: input.tanggal,
    tipe: input.tipe,
    kategori: input.kategori,
    jumlah: input.jumlah,
    keterangan: input.keterangan || null,
    dicatat_oleh: u.user.id,
  });
  if (error) throw error;
}

export async function hapusKas(id: string) {
  const { error } = await supabase.from("kas").delete().eq("id", id);
  if (error) throw error;
}
