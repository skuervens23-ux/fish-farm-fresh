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

const IKAN_UMUM = ["Nila", "Lele", "Mas", "Gurame", "Patin", "Bawal"];
const UKURAN = ["300-500 gram", "500-700 gram", "700-1000 gram", "> 1 kg"];
const GRADE = ["A", "B", "C"];

const schema = z.object({
  pelanggan_id: z.string().uuid("Pilih pelanggan"),
  jenis_ikan: z.string().trim().min(2, "Jenis ikan minimal 2 karakter").max(60),
  berat_kg: z.number().positive("Berat harus > 0"),
  harga_per_kg: z.number().positive("Harga per kg harus > 0"),
});

export function FormPenjualan() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [pelangganId, setPelangganId] = useState<string | null>(null);
  const [jenisIkan, setJenisIkan] = useState("");
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
  const dibayarNum = parseFloat(jumlahDibayar) || 0;
  const sisa =
    statusBayar === "lunas" ? 0 : statusBayar === "belum" ? total : Math.max(0, total - dibayarNum);

  async function simpan() {
    if (saving) return;
    const parsed = schema.safeParse({
      pelanggan_id: pelangganId ?? "",
      jenis_ikan: jenisIkan,
      berat_kg: beratNum,
      harga_per_kg: hargaNum,
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    if (statusBayar === "sebagian" && (dibayarNum <= 0 || dibayarNum >= total)) {
      return toast.error("Jumlah dibayar harus > 0 dan < total");
    }

    setSaving(true);
    const { error } = await supabase.rpc("create_penjualan", {
      _pelanggan_id: parsed.data.pelanggan_id,
      _jenis_ikan: parsed.data.jenis_ikan,
      _berat_kg: parsed.data.berat_kg,
      _harga_per_kg: parsed.data.harga_per_kg,
      _jumlah_ekor: parseInt(jumlahEkor) || 0,
      _ukuran: ukuran || undefined,
      _grade: grade || undefined,
      _kolam: kolam || undefined,
      _status_bayar: statusBayar,
      _jumlah_dibayar: statusBayar === "sebagian" ? dibayarNum : 0,
      _status_transaksi: "disetujui",
      _catatan: catatan || undefined,
      _foto_timbangan_url: fotoTimbangan ?? undefined,
      _foto_nota_url: fotoNota ?? undefined,
    });
    setSaving(false);
    if (error) return toast.error(pesanError(error));
    toast.success("Penjualan tersimpan");
    qc.invalidateQueries({ queryKey: ["transaksi"] });
    qc.invalidateQueries({ queryKey: ["analitik"] });
    navigate({ to: "/riwayat" });
  }

  const pelangganOptions = pelangganList.map((p) => ({ value: p.id, label: p.nama }));
  const ikanOptions = Array.from(new Set([...IKAN_UMUM, ...(jenisIkan ? [jenisIkan] : [])])).map(
    (n) => ({ value: n, label: n }),
  );

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void simpan();
        }}
        className="mx-auto w-full max-w-[520px] space-y-5"
      >
        <div className="space-y-2">
          <Label>Pelanggan *</Label>
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

        <div className="space-y-2">
          <Label>Jenis Ikan *</Label>
          <SearchSelect
            options={ikanOptions}
            value={jenisIkan || null}
            onChange={setJenisIkan}
            placeholder="Pilih atau ketik jenis ikan…"
            emptyText="Tidak ada. Ketik untuk membuat baru."
            addNewLabel="Pakai jenis"
            onAddNew={(q) => q.trim() && setJenisIkan(q.trim())}
          />
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

        <div className="grid grid-cols-2 gap-3">
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
          <div className="space-y-2">
            <Label htmlFor="berat">Berat (kg) *</Label>
            <InputJumlah
              id="berat"
              value={beratKg}
              onChange={setBeratKg}
              step={0.5}
              placeholder="0"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="harga">Harga per kg (Rp) *</Label>
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

        <RingkasanTotal total={total} sisa={sisa} />

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
