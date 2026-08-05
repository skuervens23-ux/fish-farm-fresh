import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BadgeBayar, BadgeTransaksi } from "@/components/StatusBadges";
import { FotoPreview } from "@/components/UploadFoto";
import { formatKg, formatRupiah, formatTanggal } from "@/lib/format";
import type { StatusBayar, StatusTransaksi } from "@/lib/status";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/penjualan/$id")({
  head: () => ({
    meta: [
      { title: "Detail Penjualan Ikan | Bandar Ikan" },
      {
        name: "description",
        content:
          "Rincian transaksi penjualan ikan: berat, grade, total harga, bukti timbangan dan nota.",
      },
      { property: "og:title", content: "Detail Penjualan Ikan" },
      { property: "og:description", content: "Rincian transaksi penjualan ikan ke pelanggan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DetailPenjualan,
});

function DetailPenjualan() {
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["penjualan-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("penjualan")
        .select("*, pelanggan:pelanggan_id(nama)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  async function kirimKeAdmin() {
    const { error } = await supabase
      .from("penjualan")
      .update({ status_transaksi: "menunggu", alasan_tolak: null })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Dikirim ke admin");
    qc.invalidateQueries({ queryKey: ["penjualan-detail", id] });
    qc.invalidateQueries({ queryKey: ["transaksi"] });
    qc.invalidateQueries({ queryKey: ["menunggu-count"] });
  }

  const total = Number(data?.total_harga ?? 0);
  const dibayar = Number(data?.jumlah_dibayar ?? 0);
  const bisaKirim = data?.status_transaksi === "draft" || data?.status_transaksi === "ditolak";

  return (
    <AppShell title="Detail Penjualan" backTo="/riwayat">
      <div className="mx-auto w-full max-w-[560px] space-y-4 px-4 py-4">
        {isLoading && <Skeleton className="h-48 w-full" />}
        {!isLoading && !data && (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            Transaksi tidak ditemukan.
          </Card>
        )}

        {data && (
          <>
            <Card className="space-y-3 p-4">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold text-foreground">
                    {(data.pelanggan as { nama: string } | null)?.nama ?? "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatTanggal(data.tanggal)} · {data.jenis_ikan}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <BadgeTransaksi status={data.status_transaksi as StatusTransaksi} />
                  <BadgeBayar status={data.status_bayar as StatusBayar} />
                </div>
              </div>

              {data.status_transaksi === "ditolak" && data.alasan_tolak && (
                <div className="flex gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Alasan ditolak: {data.alasan_tolak}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                <Baris label="Ukuran" value={data.ukuran ?? "—"} />
                <Baris label="Grade" value={data.grade ?? "—"} />
                <Baris label="Kolam" value={data.kolam ?? "—"} />
                <Baris label="Jumlah" value={`${data.jumlah_ekor ?? 0} ekor`} />
                <Baris label="Berat" value={formatKg(Number(data.berat_kg))} />
                <Baris label="Harga / kg" value={formatRupiah(Number(data.harga_per_kg))} />
                <Baris label="Total" value={formatRupiah(total)} />
                <Baris label="Dibayar" value={formatRupiah(dibayar)} />
              </div>

              {data.catatan && (
                <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                  {data.catatan}
                </div>
              )}
            </Card>

            {(data.foto_timbangan_url || data.foto_nota_url) && (
              <Card className="space-y-2 p-4">
                <h2 className="text-sm font-semibold text-foreground">Bukti</h2>
                <div className="flex gap-3">
                  {data.foto_timbangan_url && (
                    <FotoPreview path={data.foto_timbangan_url} alt="Foto timbangan" />
                  )}
                  {data.foto_nota_url && <FotoPreview path={data.foto_nota_url} alt="Foto nota" />}
                </div>
              </Card>
            )}

            {bisaKirim && (
              <Button className="h-12 w-full text-base" onClick={() => void kirimKeAdmin()}>
                <Send className="mr-2 h-4 w-4" /> Kirim ke Admin
              </Button>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

function Baris({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium text-foreground">{value}</div>
    </div>
  );
}
