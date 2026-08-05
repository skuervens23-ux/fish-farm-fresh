import { useQuery } from "@tanstack/react-query";
import type { UIMessage } from "ai";
import { supabase } from "@/integrations/supabase/client";

export type Percakapan = {
  id: string;
  judul: string;
  updated_at: string;
};

export function usePercakapan() {
  return useQuery({
    queryKey: ["percakapan-ai"],
    queryFn: async (): Promise<Percakapan[]> => {
      const { data, error } = await supabase
        .from("percakapan_ai")
        .select("id, judul, updated_at")
        .order("updated_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function usePesan(percakapanId: string) {
  return useQuery({
    queryKey: ["pesan-ai", percakapanId],
    queryFn: async (): Promise<UIMessage[]> => {
      const { data, error } = await supabase
        .from("pesan_ai")
        .select("id, peran, isi, created_at")
        .eq("percakapan_id", percakapanId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row) => {
        const isi = row.isi as { parts?: UIMessage["parts"]; text?: string };
        return {
          id: row.id,
          role: row.peran as "user" | "assistant",
          parts: isi?.parts ?? [{ type: "text", text: isi?.text ?? "" }],
        } as UIMessage;
      });
    },
  });
}

export async function buatPercakapan(judul = "Percakapan baru") {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Belum login");
  const { data, error } = await supabase
    .from("percakapan_ai")
    .insert({ user_id: u.user.id, judul })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function hapusPercakapan(id: string) {
  const { error } = await supabase.from("percakapan_ai").delete().eq("id", id);
  if (error) throw error;
}

export async function gantiJudulPercakapan(id: string, judul: string) {
  const { error } = await supabase
    .from("percakapan_ai")
    .update({ judul: judul.slice(0, 80) })
    .eq("id", id);
  if (error) throw error;
}
