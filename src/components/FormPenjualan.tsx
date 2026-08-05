import { useMemo, useState } from "react";
import { z } from "zod";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import {
  useLotPembelian,
  LABEL_STATUS_JUAL,
  KELAS_STATUS_JUAL,
  type LotPembelian,
} from "@/lib/lot-pembelian";
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
  const [lot, setLot] = useState<LotPembelian | null>(null);
  const [cari, setCari] = useState("");

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

  const beratNum = parseFloat(beratKg) || 0;
  const hargaNum = parseFloat(hargaPerKg) || 0;
  const total = useMemo(() => +(beratNum * hargaNum).toFixed(2), [beratNum, hargaNum]);
  const modal = useMemo(
    () => +(beratNum * (lot?.harga_per_kg ?? 0)).toFixed(2),
    [beratNum, lot],
  );
  const laba = +(total - modal).toFixed(2);
  const dibayarNum = parseFloat(jumlahDibayar) || 0;
  const sisa =
    statusBayar === "lunas" ? 0 : statusBayar === "belum" ? total : Math.max(0, total - dibayarNum);

  const daftar = useMemo(() => {
    const q = cari.trim().toLowerCase();
    if (!q) return lots;
    return lots.filter(
      (l) =>
        l.jenis_ikan.toLowerCase().includes(q) ||
        (l.nama_petani ?? "").toLowerCase().includes(q) ||
        l.tanggal.includes(q),
    );
  }, [lots, cari]);

  function pilihLot(l: LotPembelian) {
    setLot(l);
    setBeratKg(String(l.kg_sisa));
    setHargaPerKg("");
  }

  async function simpan() {
    if (saving || !lot) return;
    const parsed = schema.safeParse({
      pelanggan_id: pelangganId ?? "",
      berat_kg: beratNum,
      harga_per_kg: hargaNum,
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    if (beratNum > lot.kg_sisa + 0.001) {
      return toast.error(`Sisa lot pembelian hanya ${formatKg(lot.kg_sisa)}`);
    }
    if (statusBayar === "sebagian" && (dibayarNum <= 0 || dibayarNum >= total)) {
      return toast.error("Jumlah dibayar harus > 0 dan < total");
    }

    const payload = {
      _pembelian_id: lot.id,
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
    const ringkas = `Penjualan ${lot.jenis_ikan} — ${namaPelanggan}`;

    if (sedangOffline()) {
      tambahAntrian("penjualan", ringkas, payload);
      toast.success("Tersimpan offline. Akan dikirim otomatis saat internet kembali.");
      return navigate({ to: "/riwayat" });
    }

    setSaving(true);
    const { error } = await supabase.rpc("create_penjualan_dari_pembelian", payload);
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
    qc.invalidateQueries({ queryKey: ["lot-pembelian"] });
    navigate({ to: "/riwayat" });
  }

  const pelangganOptions = pelangganList.map((p) => ({ value: p.id, label: p.nama }));

  if (!lot) {
    return (
      <div className="mx-auto w-full max-w-[640px] space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Pilih Transaksi Pembelian</h2>
          <p className="text-sm text-muted-foreground">
            Data ikan diambil otomatis dari pembelian. Pilih lot yang akan dijual.
          </p>
        </div>

        <Input
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          placeholder="Cari jenis ikan, supplier, atau tanggal…"
          className="h-12"
        />

        {lotLoading && <p className="text-sm text-muted-foreground">Memuat data pembelian…</p>}
        {!lotLoading && daftar.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Tidak ada stok pembelian yang tersisa. Input pembelian terlebih dahulu.
          </div>
        )}

        <div className="space-y-3">
          {daftar.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => pilihLot(l)}
              className="w-full rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary hover:bg-accent/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-foreground">{l.jenis_ikan}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatTanggal(l.tanggal)} · {l.nama_petani ?? "—"}
                  </div>
                </div>
                <Badge className={cn("shrink-0", KELAS_STATUS_JUAL[l.status_jual])}>
                  {LABEL_STATUS_JUAL[l.status_jual]}
                </Badge>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="text-muted-foreground">Box</div>
                  <div className="font-medium">
                    {l.box} × {l.faktor_box} kg
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Sisa stok</div>
                  <div className="font-medium">{formatKg(l.kg_sisa)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Harga beli</div>
                  <div className="font-medium">{formatRupiah(l.harga_per_kg)}/kg</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

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
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Dari pembelian
              </div>
              <div className="text-base font-semibold">{lot.jenis_ikan}</div>
              <div className="text-xs text-muted-foreground">
                {formatTanggal(lot.tanggal)} · {lot.nama_petani ?? "—"}
              </div>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setLot(null)}>
              Ganti
            </Button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Box × Faktor + Sisa</div>
              <div className="font-medium">
                {lot.box} × {lot.faktor_box} + {lot.sisa_kg} = {formatKg(lot.jumlah_kg)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Sisa belum terjual</div>
              <div className="font-medium">{formatKg(lot.kg_sisa)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Harga beli</div>
              <div className="font-medium">{formatRupiah(lot.harga_per_kg)}/kg</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Modal lot</div>
              <div className="font-medium">{formatRupiah(lot.total_harga)}</div>
            </div>
          </div>
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
            <p className="text-xs text-muted-foreground">Maks {formatKg(lot.kg_sisa)}</p>
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

        <RingkasanTotal total={total} sisa={sisa} label="Total Penjualan" />

        <div className="rounded-lg border border-border bg-card p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Modal ({formatKg(beratNum)})</span>
            <span className="font-medium">{formatRupiah(modal)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-muted-foreground">
              {laba >= 0 ? "Keuntungan" : "Kerugian"}
            </span>
            <span className={cn("font-bold", laba >= 0 ? "text-success" : "text-destructive")}>
              {formatRupiah(Math.abs(laba))}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-muted-foreground">Sisa lot setelah dijual</span>
            <span className="font-medium">
              {formatKg(Math.max(0, lot.kg_sisa - beratNum))}
              {lot.kg_sisa - beratNum > 0.001 ? " (terjual sebagian)" : " (sudah terjual)"}
            </span>
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

        <Button type="submit" className="h-12 w-full text-base" disabled={saving}>
          {saving ? "Menyimpan…" : "Simpan Penjualan"}
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
