import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { InputJumlah } from "./InputJumlah";
import { SearchSelect } from "./SearchSelect";
import { RingkasanTotal } from "./RingkasanTotal";
import { RadioStatusBayar, type StatusBayar } from "./RadioStatusBayar";
import { TambahPetaniDialog } from "./TambahPetaniDialog";
import { toast } from "sonner";

const IKAN_UMUM = ["Nila", "Lele", "Mas", "Gurame", "Patin", "Bawal"];

const schema = z
  .object({
    petani_id: z.string().uuid("Pilih petani"),
    jenis_ikan: z.string().trim().min(2, "Jenis ikan minimal 2 karakter").max(60),
    jumlah_kg: z.number().positive("Jumlah kg harus > 0"),
    harga_per_kg: z.number().positive("Harga per kg harus > 0"),
    status_bayar: z.enum(["lunas", "belum", "sebagian"]),
    jumlah_dibayar: z.number().min(0),
  })
  .refine(
    (d) => {
      if (d.status_bayar !== "sebagian") return true;
      const total = +(d.jumlah_kg * 50 * d.harga_per_kg).toFixed(2);
      return d.jumlah_dibayar > 0 && d.jumlah_dibayar < total;
    },
    { message: "Jumlah dibayar harus > 0 dan < total", path: ["jumlah_dibayar"] },
  );

export function FormPembelian() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [petaniId, setPetaniId] = useState<string | null>(null);
  const [jenisIkan, setJenisIkan] = useState("");
  const [jumlahKg, setJumlahKg] = useState("");
  const [hargaPerKg, setHargaPerKg] = useState("");
  const [statusBayar, setStatusBayar] = useState<StatusBayar>("lunas");
  const [jumlahDibayar, setJumlahDibayar] = useState("");
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

  const jumlahNum = parseFloat(jumlahKg) || 0;
  const hargaNum = parseFloat(hargaPerKg) || 0;
  const total = useMemo(() => +(jumlahNum * 50 * hargaNum).toFixed(2), [jumlahNum, hargaNum]);
  const dibayarNum = parseFloat(jumlahDibayar) || 0;
  const sisa =
    statusBayar === "lunas" ? 0 : statusBayar === "belum" ? total : Math.max(0, total - dibayarNum);

  // Reset jumlah_dibayar saat ganti status
  useEffect(() => {
    if (statusBayar !== "sebagian") setJumlahDibayar("");
  }, [statusBayar]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;

    const parsed = schema.safeParse({
      petani_id: petaniId ?? "",
      jenis_ikan: jenisIkan,
      jumlah_kg: jumlahNum,
      harga_per_kg: hargaNum,
      status_bayar: statusBayar,
      jumlah_dibayar: statusBayar === "sebagian" ? dibayarNum : 0,
    });
    if (!parsed.success) {
      return toast.error(parsed.error.issues[0].message);
    }

    setSaving(true);
    const { error } = await supabase.rpc("create_pembelian", {
      _petani_id: parsed.data.petani_id,
      _jenis_ikan: parsed.data.jenis_ikan,
      _jumlah_kg: parsed.data.jumlah_kg,
      _harga_per_kg: parsed.data.harga_per_kg,
      _status_bayar: parsed.data.status_bayar,
      _jumlah_dibayar: parsed.data.jumlah_dibayar,
    });
    setSaving(false);

    if (error) return toast.error(error.message);
    toast.success("Pembelian tersimpan");
    qc.invalidateQueries({ queryKey: ["pembelian"] });
    navigate({ to: "/pembelian" });
  }

  const petaniOptions = petaniList.map((p) => ({ value: p.id, label: p.nama }));
  const ikanOptions = Array.from(new Set([...IKAN_UMUM, ...(jenisIkan ? [jenisIkan] : [])])).map((n) => ({
    value: n,
    label: n,
  }));

  return (
    <>
      <form onSubmit={handleSubmit} className="mx-auto w-full max-w-[420px] space-y-5">
        <div className="space-y-2">
          <Label>Petani *</Label>
          <SearchSelect
            options={petaniOptions}
            value={petaniId}
            onChange={setPetaniId}
            placeholder="Pilih petani…"
            emptyText="Petani belum ada."
            addNewLabel="Tambah petani baru"
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

        <div className="space-y-2">
          <Label htmlFor="jumlah_kg">Jumlah (kg) *</Label>
          <InputJumlah id="jumlah_kg" value={jumlahKg} onChange={setJumlahKg} step={0.5} placeholder="0" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="harga_per_kg">Harga per kg (Rp) *</Label>
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

        <RingkasanTotal total={total} sisa={sisa} />

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
