import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "owner";

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
      return data.some((r) => r.role === "owner") ? "owner" : null;
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    role: query.data ?? null,
    isOwner: query.data === "owner",
    isLoading: query.isLoading,
  };
}
