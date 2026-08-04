import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldCheck, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserRole, type AppRole } from "@/hooks/useUserRole";

export const Route = createFileRoute("/_authenticated/pengguna")({
  head: () => ({
    meta: [
      { title: "Manajemen Pengguna & Hak Akses | Bandar Ikan" },
      {
        name: "description",
        content:
          "Kelola pengguna aplikasi bandar ikan dan atur hak akses masing-masing sebagai Owner atau Mandor.",
      },
      { property: "og:title", content: "Manajemen Pengguna & Hak Akses" },
      { property: "og:description", content: "Atur peran Owner dan Mandor untuk setiap pengguna." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PenggunaPage,
});

type Pengguna = { id: string; nama: string; created_at: string; role: AppRole | null };

function usePengguna(enabled: boolean) {
  return useQuery({
    queryKey: ["pengguna"],
    enabled,
    queryFn: async (): Promise<Pengguna[]> => {
      const [p, r] = await Promise.all([
        supabase.from("profiles").select("id, nama, created_at").order("created_at"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (p.error) throw p.error;
      if (r.error) throw r.error;
      const roles = new Map<string, AppRole>();
      for (const row of r.data ?? []) {
        if (roles.get(row.user_id) === "owner") continue;
        roles.set(row.user_id, row.role as AppRole);
      }
      return (p.data ?? []).map((u) => ({ ...u, role: roles.get(u.id) ?? null }));
    },
  });
}

const AKSES: Record<AppRole, string[]> = {
  owner: [
    "Semua akses Mandor",
    "Menyetujui / menolak transaksi",
    "Kelola petani, pelanggan, dan pengguna",
    "Lihat laporan, grafik, dan kas penuh",
    "Backup & restore database",
  ],
  mandor: [
    "Input pembelian & penjualan",
    "Simpan draft dan kirim ke admin",
    "Lihat riwayat transaksi",
    "Catat kas pemasukan/pengeluaran",
  ],
};

function PenggunaPage() {
  const { isOwner, isLoading: loadingRole } = useUserRole();
  const qc = useQueryClient();
  const { data: users = [], isLoading } = usePengguna(isOwner);
  const [cari, setCari] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const daftar = useMemo(
    () => users.filter((u) => (u.nama ?? "").toLowerCase().includes(cari.trim().toLowerCase())),
    [users, cari],
  );

  async function setRole(userId: string, role: AppRole) {
    setBusy(userId);
    try {
      const del = await supabase.from("user_roles").delete().eq("user_id", userId);
      if (del.error) throw del.error;
      const ins = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (ins.error) throw ins.error;
      toast.success(`Peran diubah menjadi ${role === "owner" ? "Owner" : "Mandor"}`);
      qc.invalidateQueries({ queryKey: ["pengguna"] });
      qc.invalidateQueries({ queryKey: ["user-role"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengubah peran");
    } finally {
      setBusy(null);
    }
  }

  if (loadingRole) {
    return (
      <AppShell title="Pengguna & Hak Akses">
        <div className="mx-auto w-full max-w-[900px] px-4 py-4">
          <Skeleton className="h-40 w-full" />
        </div>
      </AppShell>
    );
  }

  if (!isOwner) {
    return (
      <AppShell title="Pengguna & Hak Akses" backTo="/dashboard">
        <div className="mx-auto w-full max-w-[900px] px-4 py-6">
          <Card className="p-6 text-center text-sm text-muted-foreground">
            Halaman ini khusus Owner.
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Pengguna & Hak Akses">
      <div className="mx-auto w-full max-w-[900px] space-y-4 px-4 py-4">
        <Input
          placeholder="Cari nama pengguna…"
          value={cari}
          onChange={(e) => setCari(e.target.value)}
        />

        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : daftar.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            Tidak ada pengguna ditemukan.
          </Card>
        ) : (
          daftar.map((u) => (
            <Card key={u.id} className="space-y-3 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted">
                    <UserIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{u.nama || "(tanpa nama)"}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{u.id}</div>
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className={
                    u.role === "owner"
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground"
                  }
                >
                  {u.role === "owner" ? "Owner" : u.role === "mandor" ? "Mandor" : "Tanpa peran"}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={u.role === "mandor" ? "default" : "outline"}
                  className="flex-1"
                  disabled={busy === u.id}
                  onClick={() => setRole(u.id, "mandor")}
                >
                  Jadikan Mandor
                </Button>
                <Button
                  size="sm"
                  variant={u.role === "owner" ? "default" : "outline"}
                  className="flex-1"
                  disabled={busy === u.id}
                  onClick={() => setRole(u.id, "owner")}
                >
                  <ShieldCheck className="mr-1.5 h-4 w-4" /> Jadikan Owner
                </Button>
              </div>
            </Card>
          ))
        )}

        <Card className="space-y-3 p-4">
          <h2 className="text-sm font-semibold">Matriks Hak Akses</h2>
          {(Object.keys(AKSES) as AppRole[]).map((r) => (
            <div key={r}>
              <div className="text-xs font-semibold capitalize text-foreground">{r}</div>
              <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
                {AKSES[r].map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>
          ))}
        </Card>
      </div>
    </AppShell>
  );
}
