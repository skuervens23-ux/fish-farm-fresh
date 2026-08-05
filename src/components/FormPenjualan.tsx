import { useMemo, useState } from "react";
import { z } from "zod";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RingkasanTotal } from "./RingkasanTotal";
import { RadioStatusBayar, type StatusBayar } from "./RadioStatusBayar";
import { UploadFoto } from "./UploadFoto";
import { toast } from "sonner";
import { pesanError } from "@/lib/pesan-error";
import { kesalahanJaringan, sedangOffline, tambahAntrian } from "@/lib/offline";
import { formatKg, formatRupiah, formatTanggal } from "@/lib/format";
import { useLotPembelian, LABEL_STATUS_JUAL, KELAS_STATUS_JUAL } from "@/lib/lot-pembelian";
import { cn } from "@/lib/utils";

const schema = z.object({
  harga_per_kg: z.number().positive("Harga jual per kg harus > 0"),
});

export function FormPenjualan() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: lots = [], isLoading: lotLoading } = useLotPembelian(true);
  const [lotId, setLotId] = useState<string | null>(null);
  const lot = lots.find((l) => l.id === lotId) ?? null;

  const [hargaPerKg, setHargaPerKg] = useState("");
  const [statusBayar, setStatusBayar] = useState<StatusBayar>("lunas");
  const [jumlahDibayar, setJumlahDibayar] = useState("");
  const [fotoNota, setFotoNota] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
  const beratNum = sisaStok;
  const hargaNum = parseFloat(hargaPerKg) || 0;
  const total = useMemo(() => +(beratNum * hargaNum).toFixed(2), [beratNum, hargaNum]);
  const modal = +(beratNum * hargaBeliRata).toFixed(2);
  const laba = +(total - modal).toFixed(2);
  const dibayarNum = parseFloat(jumlahDibayar) || 0;
  const sisaBayar =
    statusBayar === "lunas" ? 0 : statusBayar === "belum" ? total : Math.max(0, total - dibayarNum);

  async function simpan() {
    if (saving) return;
    const parsed = schema.safeParse({ harga_per_kg: hargaNum });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    if (!lot) return toast.error("Pilih lot pembelian dulu");
    if (beratNum <= 0) return toast.error("Sisa lot kosong");
    const pelangganId = pelangganList[0]?.id;
    if (!pelangganId) return toast.error("Tambahkan data pelanggan dulu di menu Pelanggan");
    if (statusBayar === "sebagian" && (dibayarNum <= 0 || dibayarNum >= total)) {
      return toast.error("Jumlah dibayar harus > 0 dan < total");
    }

    const payload = {
      _pembelian_id: lot.id,
      _pelanggan_id: pelangganId,
      _berat_kg: beratNum,
      _harga_per_kg: parsed.data.harga_per_kg,
      _tanggal: new Date().toISOString().slice(0, 10),
      _status_bayar: statusBayar,
      _jumlah_dibayar: statusBayar === "sebagian" ? dibayarNum : 0,
      _jumlah_ekor: 0,
      _foto_nota_url: fotoNota ?? undefined,
    };

    const ringkas = `Penjualan ${formatKg(beratNum)}`;

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
    qc.invalidateQueries({ queryKey: ["stok-gabungan"] });
    qc.invalidateQueries({ queryKey: ["lot-pembelian"] });
    navigate({ to: "/riwayat" });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void simpan();
      }}
      className="mx-auto w-full max-w-[520px] space-y-5"
    >
      <div className="space-y-2">
        <Label>Lot Pembelian *</Label>
        {lotLoading ? (
          <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
            Memuat lot…
          </div>
        ) : lots.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
            Belum ada lot pembelian yang tersisa. Input pembelian dulu.
          </div>
        ) : (
          <div className="space-y-2">
            {lots.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setLotId(l.id)}
                className={cn(
                  "w-full rounded-lg border p-3 text-left transition",
                  lotId === l.id
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/50",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-foreground">{l.jenis_ikan}</span>
                  <span
                    className={cn(
                      "rounded px-2 py-0.5 text-[11px] font-medium",
                      KELAS_STATUS_JUAL[l.status_jual],
                    )}
                  >
                    {LABEL_STATUS_JUAL[l.status_jual]}
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {formatTanggal(l.tanggal)} · {l.nama_petani ?? "—"} · {l.box} box
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span>
                    Sisa <span className="font-medium">{formatKg(l.kg_sisa)}</span>
                  </span>
                  <span className="text-muted-foreground">Beli {formatRupiah(l.harga_per_kg)}/kg</span>
                </div>
              </button>
            ))}
          </div>
        )}
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

      <UploadFoto label="Foto Nota" value={fotoNota} onChange={setFotoNota} />

      <Button type="submit" className="h-12 w-full text-base" disabled={saving || !lot || sisaStok <= 0}>
        {!lot ? "Pilih lot dulu" : saving ? "Menyimpan…" : "Simpan Penjualan"}
      </Button>
    </form>
  );
}
