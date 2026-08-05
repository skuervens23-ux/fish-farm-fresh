import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { SearchSelect } from "./SearchSelect";
import { RingkasanTotal } from "./RingkasanTotal";
import { RadioStatusBayar, type StatusBayar } from "./RadioStatusBayar";
import { TambahPetaniDialog } from "./TambahPetaniDialog";
import { UploadFoto } from "./UploadFoto";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useJenisIkan } from "@/lib/jenis-ikan";
import { pesanError } from "@/lib/pesan-error";
import { formatKg, formatRupiah } from "@/lib/format";
import { kesalahanJaringan, sedangOffline, tambahAntrian } from "@/lib/offline";

const schema = z
  .object({
    tanggal: z.string().min(10, "Tanggal wajib diisi"),
    petani_id: z.string().uuid("Pilih supplier / nelayan"),
    jenis_ikan: z.string().trim().min(2, "Jenis ikan minimal 2 karakter").max(60),
    box: z.number().min(0, "Jumlah box tidak boleh negatif"),
    faktor_box: z.number().positive("Faktor box harus > 0"),
    sisa_kg: z.number().min(0, "Sisa kg tidak boleh negatif"),
    harga_per_kg: z.number().positive("Harga per kg harus > 0"),
    status_bayar: z.enum(["lunas", "belum", "sebagian"]),
    jumlah_dibayar: z.number().min(0),
  })
  .refine((d) => d.box * d.faktor_box + d.sisa_kg > 0, {
    message: "Total berat harus lebih dari 0",
    path: ["box"],
  })
  .refine(
    (d) => {
      if (d.status_bayar !== "sebagian") return true;
      const total = +((d.box * d.faktor_box + d.sisa_kg) * d.harga_per_kg).toFixed(2);
      return d.jumlah_dibayar > 0 && d.jumlah_dibayar < total;
    },
    { message: "Jumlah dibayar harus > 0 dan < total", path: ["jumlah_dibayar"] },
  );

export function FormPembelian() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [tanggal, setTanggal] = useState(() => new Date().toISOString().slice(0, 10));
  const [petaniId, setPetaniId] = useState<string | null>(null);
  const [jenisIkan, setJenisIkan] = useState("");
  const [box, setBox] = useState("");
  const [sisaKg, setSisaKg] = useState("");
  const [faktorBox, setFaktorBox] = useState("50");
  const [hargaPerKg, setHargaPerKg] = useState("");
  const [statusBayar, setStatusBayar] = useState<StatusBayar>("lunas");
  const [jumlahDibayar, setJumlahDibayar] = useState("");
  const [catatan, setCatatan] = useState("");
  const [fotoNota, setFotoNota] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogDefault, setDialogDefault] = useState("");

  const { data: petaniList = [] } = useQuery({
    queryKey: ["petani-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("petani")
        .select("id, nama")
        .eq("is_active", true)
        .order("nama");
      if (error) throw error;
      return data;
    },
  });

  const { data: ikanMaster = [] } = useJenisIkan();

  const boxNum = parseFloat(box) || 0;
  const sisaNum = parseFloat(sisaKg) || 0;
  const faktorNum = parseFloat(faktorBox) || 0;
  const hargaNum = parseFloat(hargaPerKg) || 0;

  const totalBerat = useMemo(
    () => +(boxNum * faktorNum + sisaNum).toFixed(3),
    [boxNum, faktorNum, sisaNum],
  );
  const total = useMemo(() => +(totalBerat * hargaNum).toFixed(2), [totalBerat, hargaNum]);
  const dibayarNum = parseFloat(jumlahDibayar) || 0;
  const sisa =
    statusBayar === "lunas" ? 0 : statusBayar === "belum" ? total : Math.max(0, total - dibayarNum);

  useEffect(() => {
    if (statusBayar !== "sebagian") setJumlahDibayar("");
  }, [statusBayar]);

  async function simpan() {
    if (saving) return;

    const parsed = schema.safeParse({
      tanggal,
      petani_id: petaniId ?? "",
      jenis_ikan: jenisIkan,
      box: boxNum,
      faktor_box: faktorNum,
      sisa_kg: sisaNum,
      harga_per_kg: hargaNum,
      status_bayar: statusBayar,
      jumlah_dibayar: statusBayar === "sebagian" ? dibayarNum : 0,
    });
    if (!parsed.success) {
      return toast.error(parsed.error.issues[0].message);
    }

    const payload = {
      _tanggal: parsed.data.tanggal,
      _petani_id: parsed.data.petani_id,
      _jenis_ikan: parsed.data.jenis_ikan,
      _box: parsed.data.box,
      _faktor_box: parsed.data.faktor_box,
      _sisa_kg: parsed.data.sisa_kg,
      _harga_per_kg: parsed.data.harga_per_kg,
      _status_bayar: parsed.data.status_bayar,
      _jumlah_dibayar: parsed.data.jumlah_dibayar,
      _status_transaksi: "disetujui" as const,
      _catatan: catatan || undefined,
      _foto_nota_url: fotoNota ?? undefined,
    };

    const namaPetani = petaniList.find((p) => p.id === parsed.data.petani_id)?.nama ?? "Supplier";

    if (sedangOffline()) {
      tambahAntrian("pembelian", `Pembelian ${parsed.data.jenis_ikan} — ${namaPetani}`, payload);
      toast.success("Tersimpan offline. Akan dikirim otomatis saat internet kembali.");
      return navigate({ to: "/riwayat" });
    }

    setSaving(true);
    const { error } = await supabase.rpc("create_pembelian", payload);
    setSaving(false);

    if (error) {
      if (kesalahanJaringan(error)) {
        tambahAntrian("pembelian", `Pembelian ${parsed.data.jenis_ikan} — ${namaPetani}`, payload);
        toast.success("Koneksi bermasalah — data disimpan offline dan akan dikirim otomatis.");
        return navigate({ to: "/riwayat" });
      }
      return toast.error(pesanError(error));
    }
    toast.success("Pembelian tersimpan");
    qc.invalidateQueries({ queryKey: ["pembelian"] });
    qc.invalidateQueries({ queryKey: ["transaksi"] });
    qc.invalidateQueries({ queryKey: ["analitik"] });
    qc.invalidateQueries({ queryKey: ["stok"] });
    navigate({ to: "/riwayat" });
  }

  const petaniOptions = petaniList.map((p) => ({ value: p.id, label: p.nama }));
  const ikanOptions = Array.from(new Set([...ikanMaster, ...(jenisIkan ? [jenisIkan] : [])])).map(
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
          <Label htmlFor="tanggal-beli">Tanggal *</Label>
          <Input
            id="tanggal-beli"
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            className="h-12"
          />
        </div>

        <div className="space-y-2">
          <Label>Supplier / Nelayan *</Label>
          <SearchSelect
            options={petaniOptions}
            value={petaniId}
            onChange={setPetaniId}
            placeholder="Pilih supplier…"
            emptyText="Supplier belum ada."
            addNewLabel="Tambah supplier baru"
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
            <Label htmlFor="box">Jumlah Box *</Label>
            <Input
              id="box"
              type="number"
              inputMode="numeric"
              step={1}
              min={0}
              value={box}
              onChange={(e) => setBox(e.target.value)}
              className="h-12"
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sisa-kg">Sisa Kg</Label>
            <Input
              id="sisa-kg"
              type="number"
              inputMode="decimal"
              step={0.5}
              min={0}
              value={sisaKg}
              onChange={(e) => setSisaKg(e.target.value)}
              className="h-12"
              placeholder="0"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="faktor-box">Faktor Box (Kg) *</Label>
            <Input
              id="faktor-box"
              type="number"
              inputMode="decimal"
              step={1}
              min={0}
              value={faktorBox}
              onChange={(e) => setFaktorBox(e.target.value)}
              className="h-12"
              placeholder="50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="harga_per_kg">Harga per Kg (Rp) *</Label>
            <Input
              id="harga_per_kg"
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

        <div className="surface-card flex items-center justify-between rounded-xl px-3.5 py-3">
          <div>
            <p className="text-xs text-muted-foreground">Total Berat (otomatis)</p>
            <p className="text-[11px] text-muted-foreground">
              ({boxNum || 0} box × {faktorNum || 0} kg) + {sisaNum || 0} kg
            </p>
          </div>
          <p className="text-lg font-semibold text-foreground">{formatKg(totalBerat)}</p>
        </div>

        <RingkasanTotal total={total} sisa={sisa} label="Total Pembelian" />
        <p className="-mt-3 text-[11px] text-muted-foreground">
          Total Berat × Harga per Kg = {formatKg(totalBerat)} × {formatRupiah(hargaNum)}
        </p>

        <div className="space-y-2">
          <Label>Status Pembayaran *</Label>
          <RadioStatusBayar value={statusBayar} onChange={setStatusBayar} />
        </div>

        {statusBayar === "sebagian" && (
          <div className="space-y-2">
            <Label htmlFor="dibayar">Jumlah Dibayar (Rp) *</Label>
            <Input
              id="dibayar"
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

        <UploadFoto label="Foto Nota" value={fotoNota} onChange={setFotoNota} />

        <div className="space-y-2">
          <Label htmlFor="catatan-beli">Catatan</Label>
          <Textarea
            id="catatan-beli"
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            rows={3}
            placeholder="Catatan tambahan (opsional)"
          />
        </div>

        <Button type="submit" className="h-12 w-full text-base" disabled={saving}>
          {saving ? "Menyimpan…" : "Simpan Pembelian"}
        </Button>
      </form>

      <TambahPetaniDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultNama={dialogDefault}
        onCreated={(p) => {
          qc.invalidateQueries({ queryKey: ["petani-active"] });
          setPetaniId(p.id);
        }}
      />
    </>
  );
}
