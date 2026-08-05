import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Receipt, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatRupiah } from "@/lib/format";
import { pesanError } from "@/lib/pesan-error";

export const Route = createFileRoute("/_authenticated/biaya")({
  head: () => ({
    meta: [
      { title: "Biaya Operasional | ERP Bandar Ikan" },
      {
        name: "description",
        content:
          "Catat biaya operasional seperti transport, es, pakan, tenaga kerja, dan lainnya untuk menghitung laba bersih.",
      },
      { property: "og:title", content: "Biaya Operasional — ERP Bandar Ikan" },
      {
        property: "og:description",
        content: "Pencatatan pengeluaran operasional harian yang memotong laba bersih.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BiayaPage,
});

const KATEGORI = ["es", "muat", "konsumsi", "mobil", "tabungan", "lainnya"];
const labelKategori = (k: string) => k.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

function BiayaPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [tanggal, setTanggal] = useState(() => new Date().toISOString().slice(0, 10));
  const [kategori, setKategori] = useState("es");
  const [jumlah, setJumlah] = useState("");
  const [jumlahBalok, setJumlahBalok] = useState("");
  const [hargaPerBalok, setHargaPerBalok] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["biaya-operasional"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("biaya_operasional")
        .select("id, tanggal, kategori, jumlah, keterangan, jumlah_balok, harga_per_balok")
        .order("tanggal", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data;
    },
  });

  const totalBulanIni = useMemo(() => {
    const awal = new Date();
    awal.setDate(1);
    const p = awal.toISOString().slice(0, 10);
    return rows
      .filter((r) => r.tanggal >= p)
      .reduce((a, r) => a + Number(r.jumlah ?? 0), 0);
  }, [rows]);

  async function simpan() {
    const isEs = kategori === "es";
    const balok = parseFloat(jumlahBalok) || 0;
    const hargaBalok = parseFloat(hargaPerBalok) || 0;
    const n = isEs ? +(balok * hargaBalok).toFixed(2) : parseFloat(jumlah);
    if (isEs && (balok <= 0 || hargaBalok <= 0)) {
      return toast.error("Jumlah balok dan harga per balok harus lebih dari 0");
    }
    if (!n || n <= 0) return toast.error("Jumlah biaya harus lebih dari 0");
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("biaya_operasional").insert({
      tanggal,
      kategori,
      jumlah: n,
      jumlah_balok: isEs ? balok : null,
      harga_per_balok: isEs ? hargaBalok : null,
      keterangan: keterangan || null,
      dicatat_oleh: u.user?.id as string,
    });
    setSaving(false);
    if (error) return toast.error(pesanError(error));
    toast.success("Biaya tercatat");
    setJumlah("");
    setJumlahBalok("");
    setHargaPerBalok("");
    setKeterangan("");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["biaya-operasional"] });
    qc.invalidateQueries({ queryKey: ["analitik"] });
  }

  const perKategori = useMemo(() => {
    const awal = new Date();
    awal.setDate(1);
    const p = awal.toISOString().slice(0, 10);
    const map = new Map<string, number>();
    for (const k of KATEGORI) map.set(k, 0);
    for (const r of rows.filter((x) => x.tanggal >= p)) {
      map.set(r.kategori, (map.get(r.kategori) ?? 0) + Number(r.jumlah ?? 0));
    }
    return Array.from(map.entries());
  }, [rows]);

  async function hapus(id: string) {
    const { error } = await supabase.from("biaya_operasional").delete().eq("id", id);
    if (error) return toast.error(pesanError(error));
    toast.success("Biaya dihapus");
    qc.invalidateQueries({ queryKey: ["biaya-operasional"] });
    qc.invalidateQueries({ queryKey: ["analitik"] });
  }

  return (
    <AppShell
      title="Biaya Operasional"
      actions={
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> Tambah
        </Button>
      }
    >
      <div className="mx-auto w-full max-w-[720px] space-y-3 px-4 py-4">
        <Card className="surface-card rounded-xl p-3.5">
          <p className="text-xs text-muted-foreground">Total biaya bulan ini</p>
          <p className="text-xl font-semibold text-destructive">{formatRupiah(totalBulanIni)}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {perKategori.map(([k, v]) => (
              <div key={k} className="rounded-lg border border-border/60 px-2.5 py-2">
                <p className="text-[11px] text-muted-foreground">{labelKategori(k)}</p>
                <p className="text-sm font-medium text-foreground">{formatRupiah(v)}</p>
              </div>
            ))}
          </div>
        </Card>

        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : rows.length === 0 ? (
          <Card className="surface-card rounded-xl p-6 text-center text-sm text-muted-foreground">
            Belum ada biaya operasional.
          </Card>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.id}>
                <Card className="surface-card flex items-center gap-3 rounded-xl p-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-destructive/12 text-destructive">
                    <Receipt className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">
                      {labelKategori(r.kategori)}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {new Date(r.tanggal).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      {r.jumlah_balok
                        ? ` • ${Number(r.jumlah_balok)} balok × ${formatRupiah(Number(r.harga_per_balok ?? 0))}`
                        : ""}
                      {r.keterangan ? ` • ${r.keterangan}` : ""}
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-medium text-destructive">
                    {formatRupiah(Number(r.jumlah ?? 0))}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Hapus biaya"
                    onClick={() => void hapus(r.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Biaya Operasional</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="b-tanggal">Tanggal</Label>
              <Input
                id="b-tanggal"
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select value={kategori} onValueChange={setKategori}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KATEGORI.map((k) => (
                    <SelectItem key={k} value={k}>
                      {labelKategori(k)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {kategori === "es" ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="b-balok">Jumlah Balok</Label>
                    <Input
                      id="b-balok"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={jumlahBalok}
                      onChange={(e) => setJumlahBalok(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="b-harga-balok">Harga per Balok (Rp)</Label>
                    <Input
                      id="b-harga-balok"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={hargaPerBalok}
                      onChange={(e) => setHargaPerBalok(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                  <span className="text-xs text-muted-foreground">Total Es (otomatis)</span>
                  <span className="text-sm font-semibold text-foreground">
                    {formatRupiah((parseFloat(jumlahBalok) || 0) * (parseFloat(hargaPerBalok) || 0))}
                  </span>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="b-jumlah">Jumlah (Rp)</Label>
                <Input
                  id="b-jumlah"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={jumlah}
                  onChange={(e) => setJumlah(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="b-ket">Keterangan (opsional)</Label>
              <Input
                id="b-ket"
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
              />
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
