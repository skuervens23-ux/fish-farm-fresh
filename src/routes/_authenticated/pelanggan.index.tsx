import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, UserX, UserCheck, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TambahPelangganDialog } from "@/components/TambahPelangganDialog";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";
import { pesanError } from "@/lib/pesan-error";

export const Route = createFileRoute("/_authenticated/pelanggan/")({
  head: () => ({
    meta: [
      { title: "Data Customer | Bandar Ikan" },
      {
        name: "description",
        content: "Kelola data pelanggan pembeli ikan: tambah pelanggan baru dan atur status aktif.",
      },
      { property: "og:title", content: "Data Customer" },
      { property: "og:description", content: "Kelola pelanggan pembeli ikan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PelangganPage,
});

function PelangganPage() {
  const { isOwner, isLoading } = useUserRole();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data = [], isLoading: loadingList } = useQuery({
    queryKey: ["pelanggan-all"],
    queryFn: async () => {
      const [list, kontak] = await Promise.all([
        supabase.from("pelanggan").select("id, nama, is_active").order("nama"),
        supabase.rpc("kontak_pelanggan"),
      ]);
      if (list.error) throw list.error;
      const map = new Map((kontak.data ?? []).map((k) => [k.id, k]));
      return (list.data ?? []).map((p) => ({
        ...p,
        telepon: map.get(p.id)?.telepon ?? null,
        alamat: map.get(p.id)?.alamat ?? null,
      }));
    },
  });

  async function toggleActive(id: string, next: boolean) {
    const { error } = await supabase.from("pelanggan").update({ is_active: next }).eq("id", id);
    if (error) return toast.error(pesanError(error));
    toast.success(next ? "Pelanggan diaktifkan" : "Pelanggan dinonaktifkan");
    qc.invalidateQueries({ queryKey: ["pelanggan-all"] });
    qc.invalidateQueries({ queryKey: ["pelanggan-active"] });
  }

  if (!isLoading && !isOwner) {
    return (
      <AppShell title="Data Customer">
        <div className="mx-auto max-w-[520px] px-4 py-8">
          <Card className="p-6 text-center">
            <ShieldAlert className="mx-auto h-8 w-8 text-warning" />
            <p className="mt-3 text-sm font-medium">Akses ditolak</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Hanya owner yang dapat mengelola data pelanggan.
            </p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => navigate({ to: "/dashboard" })}
            >
              Kembali ke Dashboard
            </Button>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Data Customer">
      <div className="mx-auto w-full max-w-[900px] space-y-3 px-4 py-4">
        <Button className="h-12 w-full" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Tambah Customer
        </Button>

        {loadingList && <p className="text-sm text-muted-foreground">Memuat…</p>}
        {!loadingList && data.length === 0 && (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            Belum ada pelanggan.
          </Card>
        )}
        <ul className="space-y-3">
          {data.map((p) => (
            <li key={p.id}>
              <Card className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{p.nama}</span>
                    {!p.is_active && (
                      <Badge variant="secondary" className="bg-muted text-muted-foreground">
                        Nonaktif
                      </Badge>
                    )}
                  </div>
                  {p.telepon && <div className="text-xs text-muted-foreground">{p.telepon}</div>}
                  {p.alamat && <div className="text-xs text-muted-foreground">{p.alamat}</div>}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleActive(p.id, !p.is_active)}
                >
                  {p.is_active ? (
                    <>
                      <UserX className="mr-1 h-4 w-4" /> Nonaktifkan
                    </>
                  ) : (
                    <>
                      <UserCheck className="mr-1 h-4 w-4" /> Aktifkan
                    </>
                  )}
                </Button>
              </Card>
            </li>
          ))}
        </ul>
      </div>

      <TambahPelangganDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={() => {
          qc.invalidateQueries({ queryKey: ["pelanggan-all"] });
          qc.invalidateQueries({ queryKey: ["pelanggan-active"] });
        }}
      />
    </AppShell>
  );
}
