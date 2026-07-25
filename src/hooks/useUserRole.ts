import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "owner" | "mandor";

export function useUserRole() {
  const query = useQuery({
    queryKey: ["user-role"],
    queryFn: async (): Promise<AppRole | null> => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id);
      if (error) throw error;
      if (!data || data.length === 0) return null;
      // Owner beats mandor when both exist.
      if (data.some((r) => r.role === "owner")) return "owner";
      return (data[0].role as AppRole) ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    role: query.data ?? null,
    isOwner: query.data === "owner",
    isMandor: query.data === "mandor",
    isLoading: query.isLoading,
  };
}
