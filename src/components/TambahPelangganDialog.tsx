import { useState, useEffect } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const schema = z.object({
  nama: z.string().trim().min(2, "Nama minimal 2 karakter").max(80),
  telepon: z.string().trim().max(20).optional().or(z.literal("")),
  alamat: z.string().trim().max(200).optional().or(z.literal("")),
});

export function TambahPelangganDialog({
  open,
  onOpenChange,
  defaultNama,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultNama?: string;
  onCreated: (pelanggan: { id: string; nama: string }) => void;
}) {
  const [nama, setNama] = useState(defaultNama ?? "");
  const [telepon, setTelepon] = useState("");
  const [alamat, setAlamat] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setNama(defaultNama ?? "");
      setTelepon("");
      setAlamat("");
    }
  }, [open, defaultNama]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ nama, telepon, alamat });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setSaving(true);
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      setSaving(false);
      return toast.error("Sesi berakhir, silakan masuk lagi.");
    }
    const { data, error } = await supabase
      .from("pelanggan")
      .insert({
        nama: parsed.data.nama,
        telepon: parsed.data.telepon || null,
        alamat: parsed.data.alamat || null,
        created_by: user.user.id,
      })
      .select("id, nama")
      .single();
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Pelanggan ditambahkan");
    onCreated(data);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Pelanggan</DialogTitle>
          <DialogDescription>Pelanggan baru langsung tersedia di form penjualan.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="plg-nama">Nama *</Label>
            <Input id="plg-nama" value={nama} onChange={(e) => setNama(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="plg-telepon">Telepon</Label>
            <Input id="plg-telepon" value={telepon} onChange={(e) => setTelepon(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="plg-alamat">Alamat</Label>
            <Input id="plg-alamat" value={alamat} onChange={(e) => setAlamat(e.target.value)} />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Batal
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Menyimpan…" : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
