import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Fish } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { pesanError } from "@/lib/pesan-error";

export const Route = createFileRoute("/_authenticated/jenis-ikan")({
  head: () => ({
    meta: [
      { title: "Jenis Ikan | ERP Bandar Ikan" },
      {
        name: "description",
        content: "Kelola daftar jenis ikan yang dibeli dari supplier dan dijual ke pasar.",
      },
      { property: "og:title", content: "Master Jenis Ikan — ERP Bandar Ikan" },
      { property: "og:description", content: "Daftar master jenis ikan untuk pencatatan transaksi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: JenisIkanPage,
});

function JenisIkanPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [nama, setNama] = useState("");
  const [catatan, setCatatan] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["jenis-ikan"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jenis_ikan")
        .select("id, nama, catatan, is_active")
        .order("nama");
      if (error) throw error;
      return data;
    },
  });

  async function simpan() {
    if (!nama.trim()) return toast.error("Nama jenis ikan wajib diisi");
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("jenis_ikan")
      .insert({ nama: nama.trim(), catatan: catatan || null, created_by: u.user?.id ?? null });
    setSaving(false);
    if (error) return toast.error(pesanError(error));
    toast.success("Jenis ikan ditambahkan");
    setNama("");
    setCatatan("");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["jenis-ikan"] });
  }

  async function toggleAktif(id: string, aktif: boolean) {
    const { error } = await supabase.from("jenis_ikan").update({ is_active: aktif }).eq("id", id);
    if (error) return toast.error(pesanError(error));
    qc.invalidateQueries({ queryKey: ["jenis-ikan"] });
  }

  return (
    <AppShell
      title="Jenis Ikan"
      actions={
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> Tambah
        </Button>
      }
    >
      <div className="mx-auto w-full max-w-[720px] space-y-3 px-4 py-4">
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : rows.length === 0 ? (
          <Card className="surface-card rounded-xl p-6 text-center text-sm text-muted-foreground">
            Belum ada jenis ikan. Tambahkan lewat tombol Tambah.
          </Card>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.id}>
                <Card className="surface-card flex items-center gap-3 rounded-xl p-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/12 text-primary">
                    <Fish className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">{r.nama}</div>
                    {r.catatan && (
                      <div className="truncate text-xs text-muted-foreground">{r.catatan}</div>
                    )}
                  </div>
                  <Switch
                    checked={r.is_active}
                    onCheckedChange={(v) => void toggleAktif(r.id, v)}
                    aria-label="Aktif"
                  />
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Jenis Ikan</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="ji-nama">Nama</Label>
              <Input id="ji-nama" value={nama} onChange={(e) => setNama(e.target.value)} autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ji-catatan">Catatan (opsional)</Label>
              <Input id="ji-catatan" value={catatan} onChange={(e) => setCatatan(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => void simpan()} disabled={saving}>
              {saving ? "Menyimpan…" : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
