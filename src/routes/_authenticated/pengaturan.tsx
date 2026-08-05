import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { pesanError } from "@/lib/pesan-error";
import { Database, Download, Save, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserRole } from "@/hooks/useUserRole";
import { buatBackup, pulihkanBackup, unduhBackup, type FileBackup } from "@/lib/backup";

export const Route = createFileRoute("/_authenticated/pengaturan")({
  head: () => ({
    meta: [
      { title: "Pengaturan & Backup Database | Bandar Ikan" },
      {
        name: "description",
        content:
          "Atur identitas perusahaan, faktor perhitungan berat, serta lakukan backup dan restore data aplikasi bandar ikan.",
      },
      { property: "og:title", content: "Pengaturan & Backup Database" },
      { property: "og:description", content: "Konfigurasi aplikasi, backup, dan restore data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PengaturanPage,
});

const FIELDS: { key: string; label: string; hint?: string }[] = [
  { key: "nama_perusahaan", label: "Nama Perusahaan" },
  { key: "alamat", label: "Alamat" },
  { key: "telepon", label: "Telepon" },
  { key: "faktor_berat", label: "Faktor Berat", hint: "Total = Berat × Faktor × Harga per kg" },
];

function usePengaturan() {
  return useQuery({
    queryKey: ["pengaturan"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pengaturan").select("key, value");
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const r of data ?? []) map[r.key] = r.value ?? "";
      return map;
    },
  });
}

function PengaturanPage() {
  const { isOwner } = useUserRole();
  const qc = useQueryClient();
  const { data: cfg, isLoading } = usePengaturan();
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [busyBackup, setBusyBackup] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cfg) setForm(cfg);
  }, [cfg]);

  async function simpan() {
    setSaving(true);
    try {
      const rows = FIELDS.map((f) => ({ key: f.key, value: form[f.key] ?? "" }));
      const { error } = await supabase.from("pengaturan").upsert(rows, { onConflict: "key" });
      if (error) throw error;
      toast.success("Pengaturan disimpan");
      qc.invalidateQueries({ queryKey: ["pengaturan"] });
    } catch (e) {
      toast.error(pesanError(e, "Gagal menyimpan"));
    } finally {
      setSaving(false);
    }
  }

  async function backup() {
    setBusyBackup(true);
    try {
      const data = await buatBackup();
      unduhBackup(data);
      toast.success("Backup berhasil diunduh");
    } catch (e) {
      toast.error(pesanError(e, "Gagal membuat backup"));
    } finally {
      setBusyBackup(false);
    }
  }

  async function restore(file: File) {
    setBusyBackup(true);
    try {
      const parsed = JSON.parse(await file.text()) as FileBackup;
      const hasil = await pulihkanBackup(parsed);
      const ringkas = Object.entries(hasil)
        .map(([t, n]) => `${t}: ${n}`)
        .join(", ");
      toast.success(`Restore selesai (${ringkas || "tidak ada data"})`);
      qc.invalidateQueries();
    } catch (e) {
      toast.error(pesanError(e, "Gagal restore"));
    } finally {
      setBusyBackup(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <AppShell title="Pengaturan">
      <div className="mx-auto w-full max-w-[900px] space-y-4 px-4 py-4">
        <Card className="space-y-3 p-4">
          <h2 className="text-sm font-semibold">Identitas Perusahaan</h2>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <>
              {FIELDS.map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <Label htmlFor={f.key}>{f.label}</Label>
                  <Input
                    id={f.key}
                    value={form[f.key] ?? ""}
                    disabled={!isOwner}
                    onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                  />
                  {f.hint && <p className="text-[11px] text-muted-foreground">{f.hint}</p>}
                </div>
              ))}
              {isOwner ? (
                <Button className="w-full" onClick={simpan} disabled={saving}>
                  <Save className="mr-1.5 h-4 w-4" />
                  {saving ? "Menyimpan…" : "Simpan Pengaturan"}
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Hanya Owner yang dapat mengubah pengaturan.
                </p>
              )}
            </>
          )}
        </Card>

        <Card className="space-y-3 p-4">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Backup & Restore Database</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Backup mengunduh seluruh data yang dapat Anda akses dalam satu file JSON. Restore
            memulihkan data master (petani, pelanggan), kas, dan pengaturan. Data transaksi
            (pembelian/penjualan) sengaja tidak ditimpa demi menjaga jejak audit.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="outline" onClick={backup} disabled={busyBackup}>
              <Download className="mr-1.5 h-4 w-4" /> Unduh Backup
            </Button>
            <Button
              variant="outline"
              disabled={!isOwner || busyBackup}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="mr-1.5 h-4 w-4" /> Restore dari File
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void restore(f);
            }}
          />
          {!isOwner && (
            <p className="text-[11px] text-muted-foreground">Restore hanya tersedia untuk Owner.</p>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
