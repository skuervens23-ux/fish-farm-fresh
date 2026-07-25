import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, LogOut, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatKg, formatRupiah, formatTanggal } from "@/lib/format";
import { useUserRole } from "@/hooks/useUserRole";

export const Route = createFileRoute("/_authenticated/pembelian/")({
  component: PembelianList,
});

function PembelianList() {
  const navigate = useNavigate();
  const { role, isOwner } = useUserRole();

  const { data = [], isLoading } = useQuery({
    queryKey: ["pembelian"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pembelian")
        .select("id, tanggal, jenis_ikan, jumlah_kg, harga_per_kg, total_harga, status_bayar, jumlah_dibayar, petani:petani_id(nama)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const today = new Date().toISOString().slice(0, 10);
  const totalHariIni = data
    .filter((p) => p.tanggal === today)
    .reduce((s, p) => s + Number(p.total_harga), 0);
  const totalHutang = data.reduce(
    (s, p) => s + Math.max(0, Number(p.total_harga) - Number(p.jumlah_dibayar)),
    0,
  );

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <main className="min-h-screen bg-muted/40 pb-24">
      <header className="sticky top-0 z-10 border-b border-border bg-background">
        <div className="mx-auto flex max-w-[420px] items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-foreground">Pembelian</h1>
            {role && (
              <Badge
                variant="secondary"
                className={
                  isOwner
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground"
                }
              >
                {isOwner ? "Owner" : "Mandor"}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {isOwner && (
              <Button variant="ghost" size="icon" asChild aria-label="Kelola Petani">
                <Link to="/petani">
                  <Users className="h-4 w-4" />
                </Link>
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={signOut} aria-label="Keluar">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[420px] px-4 pt-4">
        {isOwner && (
          <Card className="mb-4 grid grid-cols-2 gap-3 p-4">
            <div>
              <div className="text-xs text-muted-foreground">Total hari ini</div>
              <div className="text-base font-semibold text-primary">
                {formatRupiah(totalHariIni)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Total hutang</div>
              <div className="text-base font-semibold text-hutang">
                {formatRupiah(totalHutang)}
              </div>
            </div>
          </Card>
        )}

        {isLoading && <p className="text-sm text-muted-foreground">Memuat…</p>}
        {!isLoading && data.length === 0 && (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            Belum ada pembelian. Tekan tombol di bawah untuk menambah.
          </Card>
        )}
        <ul className="space-y-3">
          {data.map((p) => {
            const sisa = Number(p.total_harga) - Number(p.jumlah_dibayar);
            return (
              <li key={p.id}>
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-foreground">
                        {p.petani?.nama ?? "—"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatTanggal(p.tanggal)} · {p.jenis_ikan}
                      </div>
                    </div>
                    <StatusBadge status={p.status_bayar} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">Jumlah</div>
                      <div className="font-medium">{formatKg(Number(p.jumlah_kg))}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Total</div>
                      <div className="font-medium">{formatRupiah(Number(p.total_harga))}</div>
                    </div>
                  </div>
                  {sisa > 0 && (
                    <div className="mt-2 text-xs text-destructive">
                      Sisa hutang: {formatRupiah(sisa)}
                    </div>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background p-4">
        <div className="mx-auto max-w-[420px]">
          <Button asChild className="h-12 w-full text-base">
            <Link to="/pembelian/baru">
              <Plus className="mr-2 h-4 w-4" />
              Pembelian Baru
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: "lunas" | "belum" | "sebagian" }) {
  const map = {
    lunas: { label: "Lunas", cls: "bg-success/15 text-success" },
    belum: { label: "Belum bayar", cls: "bg-destructive/15 text-destructive" },
    sebagian: { label: "Sebagian", cls: "bg-warning/15 text-warning" },
  } as const;
  const s = map[status];
  return (
    <Badge variant="secondary" className={s.cls}>
      {s.label}
    </Badge>
  );
}
