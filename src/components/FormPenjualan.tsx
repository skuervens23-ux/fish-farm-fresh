import { useMemo, useState } from "react";
import { z } from "zod";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { InputJumlah } from "./InputJumlah";
import { SearchSelect } from "./SearchSelect";
import { RingkasanTotal } from "./RingkasanTotal";
import { RadioStatusBayar, type StatusBayar } from "./RadioStatusBayar";
import { TambahPelangganDialog } from "./TambahPelangganDialog";
import { UploadFoto } from "./UploadFoto";
import { toast } from "sonner";
import { pesanError } from "@/lib/pesan-error";
import { kesalahanJaringan, sedangOffline, tambahAntrian } from "@/lib/offline";
import { formatKg, formatRupiah, formatTanggal } from "@/lib/format";
import { useLotPembelian, LABEL_STATUS_JUAL, KELAS_STATUS_JUAL } from "@/lib/lot-pembelian";
import { cn } from "@/lib/utils";

const UKURAN = ["300-500 gram", "500-700 gram", "700-1000 gram", "> 1 kg"];
const GRADE = ["A", "B", "C"];

const schema = z.object({
  pelanggan_id: z.string().uuid("Pilih pelanggan"),
  berat_kg: z.number().positive("Berat harus > 0"),
  harga_per_kg: z.number().positive("Harga jual per kg harus > 0"),
});

export function FormPenjualan() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: lots = [], isLoading: lotLoading } = useLotPembelian(true);
  const [lotId, setLotId] = useState<string | null>(null);
  const lot = lots.find((l) => l.id === lotId) ?? null;


  const [tanggal, setTanggal] = useState(() => new Date().toISOString().slice(0, 10));
  const [pelangganId, setPelangganId] = useState<string | null>(null);
  const [ukuran, setUkuran] = useState("");
  const [grade, setGrade] = useState("");
  const [kolam, setKolam] = useState("");
  const [jumlahEkor, setJumlahEkor] = useState("");
  const [beratKg, setBeratKg] = useState("");
  const [hargaPerKg, setHargaPerKg] = useState("");
  const [statusBayar, setStatusBayar] = useState<StatusBayar>("lunas");
  const [jumlahDibayar, setJumlahDibayar] = useState("");
  const [catatan, setCatatan] = useState("");
  const [fotoTimbangan, setFotoTimbangan] = useState<string | null>(null);
  const [fotoNota, setFotoNota] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogDefault, setDialogDefault] = useState("");

  const { data: pelangganList = [] } = useQuery({
    queryKey: ["pelanggan-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pelanggan")
        .select("id, nama")
        .eq("is_active", true)
        .order("nama");
      if (error) throw error;
      return data;
    },
  });

  const sisaStok = lot?.kg_sisa ?? 0;
  const hargaBeliRata = lot?.harga_per_kg ?? 0;
  const beratNum = parseFloat(beratKg) || 0;
  const hargaNum = parseFloat(hargaPerKg) || 0;
  const total = useMemo(() => +(beratNum * hargaNum).toFixed(2), [beratNum, hargaNum]);
  const modal = +(beratNum * hargaBeliRata).toFixed(2);
  const laba = +(total - modal).toFixed(2);
  const dibayarNum = parseFloat(jumlahDibayar) || 0;
  const sisaBayar =
    statusBayar === "lunas" ? 0 : statusBayar === "belum" ? total : Math.max(0, total - dibayarNum);

  async function simpan() {
    if (saving) return;
    const parsed = schema.safeParse({
      pelanggan_id: pelangganId ?? "",
      berat_kg: beratNum,
      harga_per_kg: hargaNum,
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    if (beratNum > sisaStok + 0.001) {
      return toast.error(`Stok tersedia hanya ${formatKg(sisaStok)}`);
    }
    if (statusBayar === "sebagian" && (dibayarNum <= 0 || dibayarNum >= total)) {
      return toast.error("Jumlah dibayar harus > 0 dan < total");
    }

    const payload = {
      _pelanggan_id: parsed.data.pelanggan_id,
      _berat_kg: parsed.data.berat_kg,
      _harga_per_kg: parsed.data.harga_per_kg,
      _tanggal: tanggal,
      _status_bayar: statusBayar,
      _jumlah_dibayar: statusBayar === "sebagian" ? dibayarNum : 0,
      _jumlah_ekor: parseInt(jumlahEkor) || 0,
      _ukuran: ukuran || undefined,
      _grade: grade || undefined,
      _kolam: kolam || undefined,
      _catatan: catatan || undefined,
      _foto_timbangan_url: fotoTimbangan ?? undefined,
      _foto_nota_url: fotoNota ?? undefined,
    };

    const namaPelanggan =
      pelangganList.find((p) => p.id === parsed.data.pelanggan_id)?.nama ?? "Pelanggan";
    const ringkas = `Penjualan ${formatKg(beratNum)} — ${namaPelanggan}`;

    if (sedangOffline()) {
      tambahAntrian("penjualan", ringkas, payload);
      toast.success("Tersimpan offline. Akan dikirim otomatis saat internet kembali.");
      return navigate({ to: "/riwayat" });
    }

    setSaving(true);
    const { error } = await supabase.rpc("create_penjualan_gabungan", payload);
    setSaving(false);
    if (error) {
      if (kesalahanJaringan(error)) {
        tambahAntrian("penjualan", ringkas, payload);
        toast.success("Koneksi bermasalah — data disimpan offline dan akan dikirim otomatis.");
        return navigate({ to: "/riwayat" });
      }
      return toast.error(pesanError(error));
    }
    toast.success("Penjualan tersimpan");
    qc.invalidateQueries({ queryKey: ["transaksi"] });
    qc.invalidateQueries({ queryKey: ["analitik"] });
    qc.invalidateQueries({ queryKey: ["stok"] });
    qc.invalidateQueries({ queryKey: ["stok-gabungan"] });
    qc.invalidateQueries({ queryKey: ["lot-pembelian"] });
    navigate({ to: "/riwayat" });
  }

  const pelangganOptions = pelangganList.map((p) => ({ value: p.id, label: p.nama }));

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void simpan();
        }}
        className="mx-auto w-full max-w-[520px] space-y-5"
      >
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Stok siap jual (gabungan semua pembelian)
          </div>
          <div className="mt-1 text-2xl font-bold text-foreground">
            {stokLoading ? "…" : formatKg(sisaStok)}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Harga beli rata-rata</div>
              <div className="font-medium">{formatRupiah(hargaBeliRata)}/kg</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Nilai modal stok</div>
              <div className="font-medium">{formatRupiah(stok?.nilai_modal ?? 0)}</div>
            </div>
          </div>
          {stok?.jenis_ikan ? (
            <div className="mt-3 text-xs text-muted-foreground">
              Isi lot: {stok.jenis_ikan} · dari {stok.jumlah_lot} nota pembelian
            </div>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="tanggal-jual">Tanggal Penjualan *</Label>
          <Input
            id="tanggal-jual"
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            className="h-12"
          />
        </div>

        <div className="space-y-2">
          <Label>Pembeli *</Label>
          <SearchSelect
            options={pelangganOptions}
            value={pelangganId}
            onChange={setPelangganId}
            placeholder="Pilih pelanggan…"
            emptyText="Pelanggan belum ada."
            addNewLabel="Tambah pelanggan baru"
            onAddNew={(q) => {
              setDialogDefault(q);
              setDialogOpen(true);
            }}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="berat">Berat Dijual (kg) *</Label>
            <InputJumlah
              id="berat"
              value={beratKg}
              onChange={setBeratKg}
              step={0.5}
              placeholder="0"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Maks {formatKg(sisaStok)}</span>
              <button
                type="button"
                className="font-medium text-primary underline-offset-2 hover:underline"
                onClick={() => setBeratKg(String(sisaStok))}
              >
                Jual semua
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="harga">Harga Jual per kg (Rp) *</Label>
            <Input
              id="harga"
              type="number"
              inputMode="numeric"
              step={500}
              min={0}
              value={hargaPerKg}
              onChange={(e) => setHargaPerKg(e.target.value)}
              className="h-12"
              placeholder="0"
            />
          </div>
        </div>

        <RingkasanTotal total={total} sisa={sisaBayar} label="Total Penjualan" />

        <div className="rounded-lg border border-border bg-card p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Modal ({formatKg(beratNum)})</span>
            <span className="font-medium">{formatRupiah(modal)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-muted-foreground">{laba >= 0 ? "Keuntungan" : "Kerugian"}</span>
            <span className={cn("font-bold", laba >= 0 ? "text-success" : "text-destructive")}>
              {formatRupiah(Math.abs(laba))}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-muted-foreground">Sisa stok setelah dijual</span>
            <span className="font-medium">{formatKg(Math.max(0, sisaStok - beratNum))}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Ukuran</Label>
            <SearchSelect
              options={UKURAN.map((u) => ({ value: u, label: u }))}
              value={ukuran || null}
              onChange={setUkuran}
              placeholder="Pilih ukuran…"
              emptyText="Ketik untuk membuat baru."
              addNewLabel="Pakai ukuran"
              onAddNew={(q) => q.trim() && setUkuran(q.trim())}
            />
          </div>
          <div className="space-y-2">
            <Label>Grade</Label>
            <SearchSelect
              options={GRADE.map((g) => ({ value: g, label: g }))}
              value={grade || null}
              onChange={setGrade}
              placeholder="Pilih grade…"
              emptyText="Ketik untuk membuat baru."
              addNewLabel="Pakai grade"
              onAddNew={(q) => q.trim() && setGrade(q.trim())}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="kolam">Kolam</Label>
            <Input
              id="kolam"
              value={kolam}
              onChange={(e) => setKolam(e.target.value)}
              className="h-12"
              placeholder="Kolam 2"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ekor">Jumlah (ekor)</Label>
            <Input
              id="ekor"
              type="number"
              inputMode="numeric"
              min={0}
              value={jumlahEkor}
              onChange={(e) => setJumlahEkor(e.target.value)}
              className="h-12"
              placeholder="0"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Status Pembayaran *</Label>
          <RadioStatusBayar value={statusBayar} onChange={setStatusBayar} />
        </div>

        {statusBayar === "sebagian" && (
          <div className="space-y-2">
            <Label htmlFor="dibayar-jual">Jumlah Dibayar (Rp) *</Label>
            <Input
              id="dibayar-jual"
              type="number"
              inputMode="numeric"
              step={500}
              min={0}
              value={jumlahDibayar}
              onChange={(e) => setJumlahDibayar(e.target.value)}
              className="h-12"
              placeholder="0"
            />
          </div>
        )}

        <UploadFoto label="Foto Timbangan" value={fotoTimbangan} onChange={setFotoTimbangan} />
        <UploadFoto label="Foto Nota" value={fotoNota} onChange={setFotoNota} />

        <div className="space-y-2">
          <Label htmlFor="catatan-jual">Catatan</Label>
          <Textarea
            id="catatan-jual"
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="Penjualan rutin ke pelanggan langganan"
            rows={3}
          />
        </div>

        <Button
          type="submit"
          className="h-12 w-full text-base"
          disabled={saving || sisaStok <= 0}
        >
          {sisaStok <= 0 ? "Stok kosong" : saving ? "Menyimpan…" : "Simpan Penjualan"}
        </Button>
      </form>

      <TambahPelangganDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultNama={dialogDefault}
        onCreated={(p) => {
          qc.invalidateQueries({ queryKey: ["pelanggan-active"] });
          setPelangganId(p.id);
        }}
      />
    </>
  );
}
