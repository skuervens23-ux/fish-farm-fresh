import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ShoppingCart, TrendingUp, Sparkle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AlurLaba } from "@/components/AlurLaba";
import { RincianAngka } from "@/components/RincianAngka";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatKg, formatRupiah } from "@/lib/format";
import {
  rentang,
  useProfitCustomer,
  useProfitIkan,
  useProfitLot,
  useProfitSeries,
  useProfitSupplier,
  useRingkasanPeriode,
  useRingkasanHariIni,
  type RentangTanggal,
} from "@/lib/analitik";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard Owner | ERP Bandar Ikan" },
      {
        name: "description",
        content:
          "Ringkasan omzet, modal, biaya operasional, laba kotor, laba bersih, margin, dan grafik performa usaha bandar ikan.",
      },
      { property: "og:title", content: "Dashboard Owner — ERP Bandar Ikan" },
      {
        property: "og:description",
        content: "Omzet, modal, laba bersih, margin, dan grafik performa usaha dalam satu layar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

const PRESET = [
  { id: "7h", label: "7 Hari" },
  { id: "30h", label: "30 Hari" },
  { id: "bulan-ini", label: "Bulan Ini" },
  { id: "tahun-ini", label: "Tahun Ini" },
] as const;

export function Metrik({
  label,
  nilai,
  sub,
  aksen = "bg-primary",
  nilaiCls,
}: {
  label: string;
  nilai: string;
  sub?: string;
  aksen?: string;
  nilaiCls?: string;
}) {
  return (
    <div className="surface-card relative overflow-hidden rounded-xl p-3.5">
      <span className={`absolute inset-y-0 left-0 w-[3px] ${aksen}`} aria-hidden />
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-xl font-semibold tracking-tight ${nilaiCls ?? "text-foreground"}`}>
        {nilai}
      </p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function GrafikBox({ judul, children }: { judul: string; children: React.ReactNode }) {
  return (
    <Card className="surface-card rounded-xl p-3.5">
      <h3 className="mb-2 text-sm font-semibold text-foreground">{judul}</h3>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

const singkat = (v: number) =>
  Math.abs(v) >= 1_000_000
    ? `${(v / 1_000_000).toFixed(1)}jt`
    : Math.abs(v) >= 1000
      ? `${Math.round(v / 1000)}rb`
      : String(v);

const tglPendek = (s: string) =>
  new Date(s).toLocaleDateString("id-ID", { day: "numeric", month: "short" });

function TopList({
  judul,
  rows,
}: {
  judul: string;
  rows: { nama: string; nilai: number; sub?: string }[];
}) {
  return (
    <Card className="surface-card rounded-xl p-3.5">
      <h3 className="mb-2 text-sm font-semibold text-foreground">{judul}</h3>
      {rows.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">Belum ada data.</p>
      ) : (
        <ul className="space-y-2">
          {rows.slice(0, 5).map((r, i) => (
            <li key={`${r.nama}-${i}`} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/12 text-[11px] font-semibold text-primary">
                  {i + 1}
                </span>
                <span className="truncate text-foreground">{r.nama}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block font-medium text-foreground">{formatRupiah(r.nilai)}</span>
                {r.sub && <span className="block text-[11px] text-muted-foreground">{r.sub}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Dashboard() {
  const [preset, setPreset] = useState<(typeof PRESET)[number]["id"]>("30h");
  const r: RentangTanggal = rentang(preset);

  const { data: s, isLoading } = useRingkasanPeriode(r);
  const { data: h } = useRingkasanHariIni();
  const { data: seri = [] } = useProfitSeries(r, preset === "tahun-ini" ? "bulan" : "hari");
  const { data: supplier = [] } = useProfitSupplier(r);
  const { data: customer = [] } = useProfitCustomer(r);
  const { data: ikan = [] } = useProfitIkan(r);
  const { data: lot = [] } = useProfitLot(r);

  const chartData = seri.map((d) => ({ ...d, label: tglPendek(d.periode) }));

  return (
    <AppShell title="Dashboard">
      <div className="mx-auto w-full max-w-[1100px] space-y-4 px-4 py-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {PRESET.map((p) => (
            <Button
              key={p.id}
              size="sm"
              variant={preset === p.id ? "default" : "outline"}
              onClick={() => setPreset(p.id)}
            >
              {p.label}
            </Button>
          ))}
        </div>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Ringkasan Hari Ini</h2>
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            <Metrik
              label="Total Pembelian"
              nilai={formatRupiah(h?.total_pembelian ?? 0)}
              aksen="bg-hutang"
            />
            <Metrik
              label="Total Penjualan"
              nilai={formatRupiah(h?.total_penjualan ?? 0)}
              aksen="bg-primary"
            />
            <Metrik
              label="Total Operasional"
              nilai={formatRupiah(h?.total_operasional ?? 0)}
              aksen="bg-destructive"
            />
            <Metrik
              label="Laba Bersih"
              nilai={formatRupiah(h?.laba_bersih ?? 0)}
              sub="Penjualan − Pembelian − Operasional"
              aksen="bg-success"
              nilaiCls={(h?.laba_bersih ?? 0) < 0 ? "text-destructive" : "text-success"}
            />
            <Metrik label="Total Berat Dibeli" nilai={formatKg(h?.berat_dibeli ?? 0)} aksen="bg-hutang" />
            <Metrik label="Total Berat Terjual" nilai={formatKg(h?.berat_terjual ?? 0)} aksen="bg-primary" />
            <Metrik
              label="Nilai Persediaan"
              nilai={formatRupiah(h?.nilai_persediaan ?? 0)}
              sub="Stok tersisa"
              aksen="bg-warning"
            />
            <Metrik
              label="Nilai Modal Hari Ini"
              nilai={formatRupiah(h?.nilai_modal ?? 0)}
              aksen="bg-hutang"
            />
          </div>
        </section>

        {isLoading ? (
          <div className="space-y-2.5">
            <Skeleton className="h-56 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <>
            <AlurLaba
              penjualan={s?.total_penjualan ?? 0}
              modal={s?.total_modal ?? 0}
              biaya={s?.total_biaya ?? 0}
              labaKotor={s?.laba_kotor ?? 0}
              labaBersih={s?.laba_bersih ?? 0}
              margin={s?.margin ?? 0}
              keterangan={PRESET.find((p) => p.id === preset)?.label}
            />

            <RincianAngka
              judul="Lihat semua angka"
              deskripsi="Omzet hari ini, laba hari ini, hutang, piutang, dan saldo kas"
            >
              <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                <Metrik
                  label="Omzet Hari Ini"
                  nilai={formatRupiah(s?.omzet_hari_ini ?? 0)}
                  aksen="bg-primary"
                />
                <Metrik
                  label="Laba Hari Ini"
                  nilai={formatRupiah(s?.laba_hari_ini ?? 0)}
                  aksen="bg-success"
                  nilaiCls={(s?.laba_hari_ini ?? 0) < 0 ? "text-destructive" : "text-success"}
                />
                <Metrik
                  label="Total Modal"
                  nilai={formatRupiah(s?.total_modal ?? 0)}
                  aksen="bg-hutang"
                />
                <Metrik
                  label="Total Penjualan"
                  nilai={formatRupiah(s?.total_penjualan ?? 0)}
                  aksen="bg-primary"
                />
                <Metrik
                  label="Total Pengeluaran"
                  nilai={formatRupiah(s?.total_biaya ?? 0)}
                  aksen="bg-destructive"
                />
                <Metrik
                  label="Laba Kotor"
                  nilai={formatRupiah(s?.laba_kotor ?? 0)}
                  sub="Penjualan − Modal"
                  aksen="bg-success"
                />
                <Metrik
                  label="Laba Bersih"
                  nilai={formatRupiah(s?.laba_bersih ?? 0)}
                  sub="Laba kotor − biaya"
                  aksen="bg-success"
                  nilaiCls={(s?.laba_bersih ?? 0) < 0 ? "text-destructive" : "text-success"}
                />
                <Metrik
                  label="Margin"
                  nilai={`${(s?.margin ?? 0).toFixed(1)}%`}
                  sub="Laba bersih ÷ modal"
                  aksen="bg-warning"
                />
                <Metrik
                  label="Saldo Kas"
                  nilai={formatRupiah(s?.saldo_kas ?? 0)}
                  aksen="bg-primary"
                />
                <Metrik
                  label="Hutang ke Supplier"
                  nilai={formatRupiah(s?.hutang ?? 0)}
                  aksen="bg-hutang"
                />
                <Metrik
                  label="Piutang Customer"
                  nilai={formatRupiah(s?.piutang ?? 0)}
                  aksen="bg-warning"
                />
                <Metrik
                  label="Belum Lunas"
                  nilai={`${s?.jml_belum_lunas ?? 0} transaksi`}
                  aksen="bg-destructive"
                />
              </div>
            </RincianAngka>
          </>
        )}


        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Button asChild variant="outline" className="h-11">
            <Link to="/pembelian/baru">
              <ShoppingCart className="mr-1.5 h-4 w-4" /> Pembelian
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-11">
            <Link to="/analisis">
              <TrendingUp className="mr-1.5 h-4 w-4" /> Analisis
            </Link>
          </Button>
          <Button asChild className="h-11">
            <Link to="/ai">
              <Sparkle className="mr-1.5 h-4 w-4" /> Tanya AI
            </Link>
          </Button>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <GrafikBox judul="Grafik Pembelian">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
              <YAxis
                tickFormatter={singkat}
                tick={{ fontSize: 11 }}
                stroke="var(--color-muted-foreground)"
                width={44}
              />
              <Tooltip formatter={(v: number) => formatRupiah(v)} />
              <Bar dataKey="modal" fill="var(--color-hutang)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </GrafikBox>

          <GrafikBox judul="Grafik Penjualan">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
              <YAxis
                tickFormatter={singkat}
                tick={{ fontSize: 11 }}
                stroke="var(--color-muted-foreground)"
                width={44}
              />
              <Tooltip formatter={(v: number) => formatRupiah(v)} />
              <Area
                type="monotone"
                dataKey="penjualan"
                stroke="var(--color-primary)"
                fill="var(--color-primary)"
                fillOpacity={0.18}
              />
            </AreaChart>
          </GrafikBox>

          <GrafikBox judul="Grafik Laba Bersih">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
              <YAxis
                tickFormatter={singkat}
                tick={{ fontSize: 11 }}
                stroke="var(--color-muted-foreground)"
                width={44}
              />
              <Tooltip formatter={(v: number) => formatRupiah(v)} />
              <Line
                type="monotone"
                dataKey="laba_bersih"
                stroke="var(--color-success)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </GrafikBox>

          <GrafikBox judul="Grafik Operasional">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
              <YAxis
                tickFormatter={singkat}
                tick={{ fontSize: 11 }}
                stroke="var(--color-muted-foreground)"
                width={44}
              />
              <Tooltip formatter={(v: number) => formatRupiah(v)} />
              <Bar dataKey="biaya" fill="var(--color-destructive)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </GrafikBox>

          <Card className="surface-card rounded-xl p-3.5">
            <h3 className="mb-2 text-sm font-semibold text-foreground">Keuntungan per LOT</h3>
            {lot.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Belum ada data.</p>
            ) : (
              <ul className="space-y-2">
                {lot.slice(0, 5).map((l) => (
                  <li key={l.lot} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-foreground">
                      {new Date(l.lot).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <span className="text-right">
                      <span
                        className={`block font-medium ${l.laba_bersih < 0 ? "text-destructive" : "text-success"}`}
                      >
                        {formatRupiah(l.laba_bersih)}
                      </span>
                      <span className="block text-[11px] text-muted-foreground">
                        margin {l.margin.toFixed(1)}%
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <TopList
            judul="Supplier Terbesar"
            rows={supplier.map((x) => ({
              nama: x.nama,
              nilai: x.modal,
              sub: `${x.transaksi} transaksi`,
            }))}
          />
          <TopList
            judul="Customer Terbesar"
            rows={customer.map((x) => ({
              nama: x.nama,
              nilai: x.omzet,
              sub: `${x.transaksi} transaksi`,
            }))}
          />
          <TopList
            judul="Jenis Ikan Terlaris"
            rows={ikan.map((x) => ({
              nama: x.jenis_ikan,
              nilai: x.penjualan,
              sub: `${x.kg_jual.toLocaleString("id-ID")} kg terjual`,
            }))}
          />
        </div>
      </div>
    </AppShell>
  );
}
