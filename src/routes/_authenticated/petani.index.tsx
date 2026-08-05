import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Plus, UserX, UserCheck, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TambahPetaniDialog } from "@/components/TambahPetaniDialog";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";
import { pesanError } from "@/lib/pesan-error";

export const Route = createFileRoute("/_authenticated/petani/")({
  head: () => ({
    meta: [
      { title: "Kelola Supplier — Pembelian Ikan Hidup" },
      {
        name: "description",
        content: "Kelola data petani: tambah petani baru dan atur status aktif.",
      },
      { property: "og:title", content: "Kelola Supplier" },
      {
        property: "og:description",
        content: "Kelola data petani untuk pencatatan pembelian ikan hidup.",
      },
    ],
  }),
  component: PetaniPage,
});

function PetaniPage() {
  const { isOwner, isLoading } = useUserRole();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data = [], isLoading: loadingList } = useQuery({
    queryKey: ["petani-all"],
    queryFn: async () => {
      const [list, kontak] = await Promise.all([
        supabase.from("petani").select("id, nama, is_active").order("nama"),
        supabase.rpc("kontak_petani"),
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
    const { error } = await supabase.from("petani").update({ is_active: next }).eq("id", id);
    if (error) return toast.error(pesanError(error));
    toast.success(next ? "Petani diaktifkan" : "Petani dinonaktifkan");
    qc.invalidateQueries({ queryKey: ["petani-all"] });
    qc.invalidateQueries({ queryKey: ["petani-active"] });
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Memuat…</p>
      </main>
    );
  }

  if (!isOwner) {
    return (
      <main className="min-h-screen bg-muted/40">
        <header className="sticky top-0 z-10 border-b border-border bg-background">
          <div className="mx-auto flex max-w-[420px] items-center gap-2 px-4 py-3">
            <button
              onClick={() => navigate({ to: "/pembelian" })}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-accent"
              aria-label="Kembali"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-semibold text-foreground">Kelola Supplier</h1>
          </div>
        </header>
        <div className="mx-auto max-w-[420px] px-4 pt-8">
          <Card className="p-6 text-center">
            <ShieldAlert className="mx-auto h-8 w-8 text-warning" />
            <p className="mt-3 text-sm font-medium">Akses ditolak</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Hanya owner yang dapat mengelola petani. Hubungi owner untuk perubahan.
            </p>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-muted/40 pb-24">
      <header className="sticky top-0 z-10 border-b border-border bg-background">
        <div className="mx-auto flex max-w-[420px] items-center gap-2 px-4 py-3">
          <Link
            to="/pembelian"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-accent"
            aria-label="Kembali"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-semibold text-foreground">Kelola Supplier</h1>
        </div>
      </header>

      <div className="mx-auto max-w-[420px] px-4 pt-4">
        {loadingList && <p className="text-sm text-muted-foreground">Memuat…</p>}
        {!loadingList && data.length === 0 && (
          <Card className="p-6 text-center text-sm text-muted-foreground">Belum ada petani.</Card>
        )}
        <ul className="space-y-3">
          {data.map((p) => (
            <li key={p.id}>
              <Card className="p-4">
                <div className="flex items-start justify-between gap-3">
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
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background p-4">
        <div className="mx-auto max-w-[420px]">
          <Button className="h-12 w-full text-base" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Supplier
          </Button>
        </div>
      </div>

      <TambahPetaniDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={() => {
          qc.invalidateQueries({ queryKey: ["petani-all"] });
          qc.invalidateQueries({ queryKey: ["petani-active"] });
        }}
      />
    </main>
  );
}
