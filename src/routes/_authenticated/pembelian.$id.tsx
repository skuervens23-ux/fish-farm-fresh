import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BayarHutangDialog } from "@/components/BayarHutangDialog";
import { formatKg, formatRupiah, formatTanggal } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/pembelian/$id")({
  head: () => ({
    meta: [
      { title: "Detail Pembelian Ikan | Bandar Ikan" },
      {
        name: "description",
        content:
          "Rincian transaksi pembelian ikan: total harga, sisa hutang, riwayat pembayaran, dan pelunasan.",
      },
      { property: "og:title", content: "Detail Pembelian Ikan" },
      {
        property: "og:description",
        content: "Rincian transaksi pembelian ikan dan pelunasan hutang petani.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DetailPembelian,
});

function DetailPembelian() {
  const { id } = Route.useParams();
  const [bayarOpen, setBayarOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["pembelian-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pembelian")
        .select(
          "id, tanggal, jenis_ikan, jumlah_kg, box, faktor_box, sisa_kg, harga_per_kg, total_harga, jumlah_dibayar, status_bayar, created_at, petani:petani_id(nama)",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: pembayaran = [] } = useQuery({
    queryKey: ["pembayaran", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pembayaran")
        .select("id, jumlah, created_at")
        .eq("referensi_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const total = Number(data?.total_harga ?? 0);
  const dibayar = Number(data?.jumlah_dibayar ?? 0);
  const sisa = Math.max(0, total - dibayar);

  return (
    <main className="min-h-screen bg-muted/40 pb-24">
      <header className="sticky top-0 z-10 border-b border-border bg-background">
        <div className="mx-auto flex max-w-[420px] items-center gap-2 px-4 py-3">
          <Link
            to="/pembelian"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-accent"
            aria-label="Kembali"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-semibold text-foreground">Detail Pembelian</h1>
        </div>
      </header>

      <div className="mx-auto max-w-[420px] space-y-4 px-4 pt-4">
        {isLoading && <Skeleton className="h-40 w-full" />}
        {!isLoading && !data && (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            Transaksi tidak ditemukan.
          </Card>
        )}

        {data && (
          <>
            <Card className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-semibold text-foreground">
                    {data.petani?.nama ?? "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatTanggal(data.tanggal)} · {data.jenis_ikan}
                  </div>
                </div>
                <StatusBadge status={data.status_bayar} />
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Baris label="Total Berat" value={formatKg(Number(data.jumlah_kg))} />
                <Baris
                  label="Box"
                  value={`${Number(data.box ?? 0)} box × ${Number(data.faktor_box ?? 0)} kg`}
                />
                <Baris label="Sisa Kg" value={formatKg(Number(data.sisa_kg ?? 0))} />
                <Baris label="Harga / kg" value={formatRupiah(Number(data.harga_per_kg))} />
                <Baris label="Total pembelian" value={formatRupiah(total)} />
                <Baris label="Sudah dibayar" value={formatRupiah(dibayar)} />
              </div>
              {sisa > 0 && (
                <div className="rounded-md bg-hutang/10 p-3 text-sm">
                  Sisa hutang:{" "}
                  <span className="font-semibold text-hutang">{formatRupiah(sisa)}</span>
                </div>
              )}
            </Card>

            <section>
              <h2 className="mb-2 text-sm font-semibold text-foreground">Riwayat Pembayaran</h2>
              {pembayaran.length === 0 ? (
                <Card className="p-4 text-sm text-muted-foreground">Belum ada pembayaran.</Card>
              ) : (
                <ul className="space-y-2">
                  {pembayaran.map((p) => (
                    <li key={p.id}>
                      <Card className="flex items-center justify-between p-3 text-sm">
                        <span className="text-muted-foreground">
                          {new Date(p.created_at).toLocaleString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span className="font-medium text-success">
                          {formatRupiah(Number(p.jumlah))}
                        </span>
                      </Card>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>

      {data && sisa > 0 && (
        <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background p-4">
          <div className="mx-auto max-w-[420px]">
            <Button className="h-12 w-full text-base" onClick={() => setBayarOpen(true)}>
              <Wallet className="mr-2 h-4 w-4" />
              Bayar Hutang
            </Button>
          </div>
        </div>
      )}

      {data && (
        <BayarHutangDialog
          open={bayarOpen}
          onOpenChange={setBayarOpen}
          pembelianId={data.id}
          sisa={sisa}
        />
      )}
    </main>
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

function StatusBadge({ status }: { status: "lunas" | "belum" | "sebagian" }) {
  const map = {
    lunas: { label: "Lunas", cls: "bg-success/15 text-success" },
    belum: { label: "Belum bayar", cls: "bg-destructive/15 text-destructive" },
    sebagian: { label: "Sebagian", cls: "bg-warning/15 text-warning" },
  } as const;
  return (
    <Badge variant="secondary" className={map[status].cls}>
      {map[status].label}
    </Badge>
  );
}
