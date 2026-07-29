import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatRupiah } from "@/lib/format";
import { toast } from "sonner";

export function BayarHutangDialog({
  open,
  onOpenChange,
  pembelianId,
  sisa,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pembelianId: string;
  sisa: number;
}) {
  const qc = useQueryClient();
  const [jumlah, setJumlah] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    const n = parseFloat(jumlah);
    if (!n || n <= 0) return toast.error("Jumlah bayar harus lebih dari 0");
    if (n > sisa) return toast.error("Jumlah bayar melebihi sisa hutang");
    setSaving(true);
    const { error } = await supabase.rpc("bayar_hutang", {
      _pembelian_id: pembelianId,
      _jumlah: n,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Pembayaran tercatat");
    setJumlah("");
    qc.invalidateQueries({ queryKey: ["pembelian"] });
    qc.invalidateQueries({ queryKey: ["pembelian-detail", pembelianId] });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[380px]">
        <DialogHeader>
          <DialogTitle>Bayar Hutang</DialogTitle>
          <DialogDescription>
            Sisa hutang saat ini {formatRupiah(sisa)}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="bayar">Jumlah Bayar (Rp)</Label>
          <Input
            id="bayar"
            type="number"
            inputMode="numeric"
            step={500}
            min={0}
            value={jumlah}
            onChange={(e) => setJumlah(e.target.value)}
            className="h-12"
            placeholder="0"
          />
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => setJumlah(String(sisa))}
          >
            Lunasi semua ({formatRupiah(sisa)})
          </Button>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={saving} className="h-12 w-full text-base">
            {saving ? "Menyimpan…" : "Simpan Pembayaran"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
