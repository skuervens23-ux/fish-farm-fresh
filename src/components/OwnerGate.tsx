import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";

/** Seluruh aplikasi hanya boleh diakses oleh pengguna dengan peran owner. */
export function OwnerGate({ children }: { children: React.ReactNode }) {
  const { isOwner, isLoading } = useUserRole();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  if (isLoading) {
    return (
      <div className="bg-app grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isOwner) {
    const keluar = async () => {
      await queryClient.cancelQueries();
      queryClient.clear();
      await supabase.auth.signOut();
      navigate({ to: "/auth", replace: true });
    };

    return (
      <div className="bg-app grid min-h-screen place-items-center p-6">
        <div className="surface-card w-full max-w-sm rounded-2xl p-6 text-center">
          <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <ShieldAlert className="h-6 w-6" />
          </span>
          <h1 className="text-lg font-semibold text-foreground">Akses ditolak</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Aplikasi ini hanya dapat diakses oleh pemilik (owner). Hubungi pemilik jika Anda
            merasa seharusnya punya akses.
          </p>
          <Button className="mt-5 w-full" onClick={keluar}>
            Keluar
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
