import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDownCircle, ArrowUpCircle, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatRupiah, formatTanggal } from "@/lib/format";
import { useUserRole } from "@/hooks/useUserRole";
import {
  KATEGORI_KELUAR,
  KATEGORI_MASUK,
  hapusKas,
  tambahKas,
  useKas,
  type TipeKas,
} from "@/lib/kas";

export const Route = createFileRoute("/_authenticated/kas")({
  head: () => ({
    meta: [
      { title: "Kas: Pemasukan & Pengeluaran | Bandar Ikan" },
      {
        name: "description",
        content:
          "Catat pemasukan dan pengeluaran kas harian usaha bandar ikan, lengkap dengan saldo dan riwayat transaksi kas.",
      },
      { property: "og:title", content: "Kas Pemasukan & Pengeluaran" },
      { property: "og:description", content: "Pencatatan arus kas usaha bandar ikan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: KasPage,
});

function FormKas({ tipe, onSaved }: { tipe: TipeKas; onSaved: () => void }) {
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [kategori, setKategori] = useState(tipe === "masuk" ? "penjualan" : "operasional");
  const [jumlah, setJumlah] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [saving, setSaving] = useState(false);
  const kategoriList = tipe === "masuk" ? KATEGORI_MASUK : KATEGORI_KELUAR;

  async function submit() {
    const nilai = Number(jumlah);
    if (!nilai || nilai <= 0) {
      toast.error("Jumlah harus lebih dari 0");
      return;
    }
    setSaving(true);
    try {
      await tambahKas({ tanggal, tipe, kategori, jumlah: nilai, keterangan });
      toast.success(tipe === "masuk" ? "Pemasukan dicatat" : "Pengeluaran dicatat");
      setJumlah("");
      setKeterangan("");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="space-y-3 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`tgl-${tipe}`}>Tanggal</Label>
          <Input
            id={`tgl-${tipe}`}
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Kategori</Label>
          <Select value={kategori} onValueChange={setKategori}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {kategoriList.map((k) => (
                <SelectItem key={k} value={k}>
                  {k.charAt(0).toUpperCase() + k.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`jml-${tipe}`}>Jumlah (Rp)</Label>
        <Input
          id={`jml-${tipe}`}
          inputMode="numeric"
          value={jumlah}
          onChange={(e) => setJumlah(e.target.value.replace(/[^\d]/g, ""))}
          placeholder="0"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`ket-${tipe}`}>Keterangan</Label>
        <Textarea
          id={`ket-${tipe}`}
          value={keterangan}
          onChange={(e) => setKeterangan(e.target.value)}
          placeholder="Opsional"
          rows={2}
        />
      </div>
      <Button className="w-full" onClick={submit} disabled={saving}>
        {saving ? "Menyimpan…" : tipe === "masuk" ? "Catat Pemasukan" : "Catat Pengeluaran"}
      </Button>
    </Card>
  );
}

function KasPage() {
  const { isOwner } = useUserRole();
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useKas();
  const [tab, setTab] = useState<TipeKas>("masuk");

  const ringkas = useMemo(() => {
    const masuk = rows.filter((r) => r.tipe === "masuk").reduce((s, r) => s + r.jumlah, 0);
    const keluar = rows.filter((r) => r.tipe === "keluar").reduce((s, r) => s + r.jumlah, 0);
    return { masuk, keluar, saldo: masuk - keluar };
  }, [rows]);

  const daftar = rows.filter((r) => r.tipe === tab);

  const refresh = () => qc.invalidateQueries({ queryKey: ["kas"] });

  async function onHapus(id: string) {
    try {
      await hapusKas(id);
      toast.success("Data kas dihapus");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus");
    }
  }

  return (
    <AppShell title="Kas">
      <div className="mx-auto w-full max-w-[900px] space-y-4 px-4 py-4">
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3">
            <div className="text-[11px] text-muted-foreground">Pemasukan</div>
            <div className="text-sm font-bold text-success">{formatRupiah(ringkas.masuk)}</div>
          </Card>
          <Card className="p-3">
            <div className="text-[11px] text-muted-foreground">Pengeluaran</div>
            <div className="text-sm font-bold text-destructive">{formatRupiah(ringkas.keluar)}</div>
          </Card>
          <Card className="p-3">
            <div className="text-[11px] text-muted-foreground">Saldo</div>
            <div className="text-sm font-bold text-primary">{formatRupiah(ringkas.saldo)}</div>
          </Card>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as TipeKas)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="masuk">
              <ArrowDownCircle className="mr-1.5 h-4 w-4" /> Pemasukan
            </TabsTrigger>
            <TabsTrigger value="keluar">
              <ArrowUpCircle className="mr-1.5 h-4 w-4" /> Pengeluaran
            </TabsTrigger>
          </TabsList>
          <TabsContent value="masuk" className="mt-3">
            <FormKas tipe="masuk" onSaved={refresh} />
          </TabsContent>
          <TabsContent value="keluar" className="mt-3">
            <FormKas tipe="keluar" onSaved={refresh} />
          </TabsContent>
        </Tabs>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold">
            Riwayat {tab === "masuk" ? "Pemasukan" : "Pengeluaran"}
          </h2>
          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : daftar.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">Belum ada data.</Card>
          ) : (
            daftar.map((r) => (
              <Card key={r.id} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium capitalize">{r.kategori}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {formatTanggal(r.tanggal)}
                    {r.keterangan ? ` • ${r.keterangan}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`text-sm font-semibold ${r.tipe === "masuk" ? "text-success" : "text-destructive"}`}
                  >
                    {r.tipe === "masuk" ? "+" : "−"}
                    {formatRupiah(r.jumlah)}
                  </div>
                  {isOwner && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Hapus"
                      onClick={() => onHapus(r.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
