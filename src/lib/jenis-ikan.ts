import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Daftar jenis ikan aktif dari master data. */
export function useJenisIkan() {
  return useQuery({
    queryKey: ["jenis-ikan-active"],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from("jenis_ikan")
        .select("nama")
        .eq("is_active", true)
        .order("nama");
      if (error) throw error;
      return (data ?? []).map((d) => d.nama);
    },
    staleTime: 5 * 60 * 1000,
  });
}
