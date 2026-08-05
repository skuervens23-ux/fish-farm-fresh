import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
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
import { AppShell } from "@/components/AppShell";
import { AlurLaba } from "@/components/AlurLaba";
import { RincianAngka } from "@/components/RincianAngka";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TombolEkspor } from "@/components/TombolEkspor";
import { TombolExcelLengkap } from "@/components/TombolExcelLengkap";
import { formatRupiah } from "@/lib/format";
import {
  rentang,
  useProfitCustomer,
  useProfitIkan,
  useProfitLot,
  useProfitSeries,
  useProfitSupplier,
  useRingkasanPeriode,
  type Periode,
} from "@/lib/analitik";


export const Route = createFileRoute("/_authenticated/analisis")({
  head: () => ({
    meta: [
      { title: "Analisis Profit | ERP Bandar Ikan" },
      {
        name: "description",
        content:
          "Analisis profit harian, mingguan, bulanan, tahunan, serta per supplier, customer, jenis ikan, dan LOT.",
      },
      { property: "og:title", content: "Analisis Profit — ERP Bandar Ikan" },
      {
        property: "og:description",
        content: "Profit per periode, supplier, customer, jenis ikan, dan LOT beserta margin.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Analisis,
});

const PRESET = [
  { id: "7h", label: "7 Hari" },
  { id: "30h", label: "30 Hari" },
  { id: "bulan-ini", label: "Bulan Ini" },
  { id: "tahun-ini", label: "Tahun Ini" },
] as const;

const GRUP: { id: Periode; label: string }[] = [
  { id: "hari", label: "Harian" },
  { id: "minggu", label: "Mingguan" },
  { id: "bulan", label: "Bulanan" },
  { id: "tahun", label: "Tahunan" },
];

const singkat = (v: number) =>
  Math.abs(v) >= 1_000_000
    ? `${(v / 1_000_000).toFixed(1)}jt`
    : Math.abs(v) >= 1000
      ? `${Math.round(v / 1000)}rb`
      : String(v);

function Tabel({
  kolom,
  rows,
}: {
  kolom: string[];
  rows: (string | number)[][];
}) {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Belum ada data.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
            {kolom.map((k, i) => (
              <th key={k} className={`py-2 pr-3 font-medium ${i > 0 ? "text-right" : ""}`}>
                {k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-border/40 last:border-0">
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={`py-2 pr-3 ${ci > 0 ? "text-right tabular-nums" : "text-foreground"}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Analisis() {
  const [preset, setPreset] = useState<(typeof PRESET)[number]["id"]>("30h");
  const [grup, setGrup] = useState<Periode>("hari");
  const r = rentang(preset);

  const { data: s } = useRingkasanPeriode(r);
  const { data: seri = [] } = useProfitSeries(r, grup);
  const { data: supplier = [] } = useProfitSupplier(r);
  const { data: customer = [] } = useProfitCustomer(r);
  const { data: ikan = [] } = useProfitIkan(r);
  const { data: lot = [] } = useProfitLot(r);

  const chartData = seri.map((d) => ({
    ...d,
    label: new Date(d.periode).toLocaleDateString("id-ID", {
      day: grup === "hari" || grup === "minggu" ? "numeric" : undefined,
      month: grup === "tahun" ? undefined : "short",
      year: grup === "tahun" || grup === "bulan" ? "numeric" : undefined,
    }),
  }));

  const lembarEkspor = () => [
    {
      nama: "Ringkasan",
      kolom: ["Metrik", "Nilai"],
      rows: [
        ["Total Modal", s?.total_modal ?? 0],
        ["Total Penjualan", s?.total_penjualan ?? 0],
        ["Total Biaya Operasional", s?.total_biaya ?? 0],
        ["Laba Kotor", s?.laba_kotor ?? 0],
        ["Laba Bersih", s?.laba_bersih ?? 0],
        ["Margin (%)", Number((s?.margin ?? 0).toFixed(2))],
        ["Hutang", s?.hutang ?? 0],
        ["Piutang", s?.piutang ?? 0],
      ] as (string | number)[][],
    },
    {
      nama: "Profit per Periode",
      kolom: ["Periode", "Modal", "Penjualan", "Biaya", "Laba Kotor", "Laba Bersih", "Margin (%)"],
      rows: seri.map((x) => [
        x.periode,
        x.modal,
        x.penjualan,
        x.biaya,
        x.laba_kotor,
        x.laba_bersih,
        Number(x.margin.toFixed(2)),
      ]),
    },
    {
      nama: "Supplier",
      kolom: ["Supplier", "Transaksi", "Kg", "Modal", "Hutang"],
      rows: supplier.map((x) => [x.nama, x.transaksi, x.total_kg, x.modal, x.hutang]),
    },
    {
      nama: "Customer",
      kolom: ["Customer", "Transaksi", "Kg", "Omzet", "Piutang"],
      rows: customer.map((x) => [x.nama, x.transaksi, x.total_kg, x.omzet, x.piutang]),
    },
    {
      nama: "Jenis Ikan",
      kolom: ["Jenis Ikan", "Kg Beli", "Kg Jual", "Modal", "Penjualan", "Laba", "Margin (%)"],
      rows: ikan.map((x) => [
        x.jenis_ikan,
        x.kg_beli,
        x.kg_jual,
        x.modal,
        x.penjualan,
        x.laba_kotor,
        Number(x.margin.toFixed(2)),
      ]),
    },
    {
      nama: "LOT",
      kolom: [
        "LOT",
        "Kg Beli",
        "Kg Jual",
        "Modal",
        "Penjualan",
        "Biaya",
        "Laba Bersih",
        "Margin (%)",
      ],
      rows: lot.map((x) => [
        x.lot,
        x.kg_beli,
        x.kg_jual,
        x.modal,
        x.penjualan,
        x.biaya,
        x.laba_bersih,
        Number(x.margin.toFixed(2)),
      ]),
    },
  ];

  return (
    <AppShell title="Analisis Profit">
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
          <div className="ml-auto flex items-center gap-1.5">
            <TombolExcelLengkap dari={r.dari} sampai={r.sampai} />
            <TombolEkspor
              judul="Analisis Profit — ERP Bandar Ikan"
              subjudul={`Periode ${r.dari} s/d ${r.sampai}`}
              namaFile={`Analisis-Profit-${r.dari}_sd_${r.sampai}`}
              data={lembarEkspor}
            />
          </div>
        </div>


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
          deskripsi="Modal, penjualan, biaya, laba kotor, hutang, dan piutang"
        >
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            <Card className="surface-card rounded-xl p-3.5">
              <p className="text-xs text-muted-foreground">Total Modal</p>
              <p className="text-lg font-semibold">{formatRupiah(s?.total_modal ?? 0)}</p>
            </Card>
            <Card className="surface-card rounded-xl p-3.5">
              <p className="text-xs text-muted-foreground">Total Penjualan</p>
              <p className="text-lg font-semibold">{formatRupiah(s?.total_penjualan ?? 0)}</p>
            </Card>
            <Card className="surface-card rounded-xl p-3.5">
              <p className="text-xs text-muted-foreground">Biaya Operasional</p>
              <p className="text-lg font-semibold">{formatRupiah(s?.total_biaya ?? 0)}</p>
            </Card>
            <Card className="surface-card rounded-xl p-3.5">
              <p className="text-xs text-muted-foreground">Laba Kotor</p>
              <p className="text-lg font-semibold">{formatRupiah(s?.laba_kotor ?? 0)}</p>
            </Card>
            <Card className="surface-card rounded-xl p-3.5">
              <p className="text-xs text-muted-foreground">Laba Bersih</p>
              <p
                className={`text-lg font-semibold ${(s?.laba_bersih ?? 0) < 0 ? "text-destructive" : "text-success"}`}
              >
                {formatRupiah(s?.laba_bersih ?? 0)}
              </p>
            </Card>
            <Card className="surface-card rounded-xl p-3.5">
              <p className="text-xs text-muted-foreground">Margin</p>
              <p className="text-lg font-semibold">{(s?.margin ?? 0).toFixed(1)}%</p>
            </Card>
            <Card className="surface-card rounded-xl p-3.5">
              <p className="text-xs text-muted-foreground">Hutang ke Supplier</p>
              <p className="text-lg font-semibold">{formatRupiah(s?.hutang ?? 0)}</p>
            </Card>
            <Card className="surface-card rounded-xl p-3.5">
              <p className="text-xs text-muted-foreground">Piutang Customer</p>
              <p className="text-lg font-semibold">{formatRupiah(s?.piutang ?? 0)}</p>
            </Card>
          </div>
        </RincianAngka>


        <Card className="surface-card rounded-xl p-3.5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">Pertumbuhan Profit</h3>
            <div className="flex flex-wrap gap-1.5">
              {GRUP.map((g) => (
                <Button
                  key={g.id}
                  size="sm"
                  variant={grup === g.id ? "secondary" : "ghost"}
                  onClick={() => setGrup(g.id)}
                >
                  {g.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  stroke="var(--color-muted-foreground)"
                />
                <YAxis
                  tickFormatter={singkat}
                  tick={{ fontSize: 11 }}
                  stroke="var(--color-muted-foreground)"
                  width={44}
                />
                <Tooltip formatter={(v: number) => formatRupiah(v)} />
                <Line
                  type="monotone"
                  dataKey="penjualan"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="laba_bersih"
                  stroke="var(--color-success)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="surface-card rounded-xl p-3.5">
          <h3 className="mb-2 text-sm font-semibold text-foreground">Margin per Periode</h3>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  stroke="var(--color-muted-foreground)"
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="var(--color-muted-foreground)"
                  width={40}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip formatter={(v: number) => `${Number(v).toFixed(1)}%`} />
                <Bar dataKey="margin" fill="var(--color-warning)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="surface-card rounded-xl p-3.5">
          <Tabs defaultValue="supplier">
            <TabsList className="mb-3 flex-wrap">
              <TabsTrigger value="supplier">Supplier</TabsTrigger>
              <TabsTrigger value="customer">Customer</TabsTrigger>
              <TabsTrigger value="ikan">Jenis Ikan</TabsTrigger>
              <TabsTrigger value="lot">LOT</TabsTrigger>
            </TabsList>
            <TabsContent value="supplier">
              <Tabel
                kolom={["Supplier", "Transaksi", "Kg", "Modal", "Hutang"]}
                rows={supplier.map((x) => [
                  x.nama,
                  x.transaksi,
                  x.total_kg.toLocaleString("id-ID"),
                  formatRupiah(x.modal),
                  formatRupiah(x.hutang),
                ])}
              />
            </TabsContent>
            <TabsContent value="customer">
              <Tabel
                kolom={["Customer", "Transaksi", "Kg", "Omzet", "Piutang"]}
                rows={customer.map((x) => [
                  x.nama,
                  x.transaksi,
                  x.total_kg.toLocaleString("id-ID"),
                  formatRupiah(x.omzet),
                  formatRupiah(x.piutang),
                ])}
              />
            </TabsContent>
            <TabsContent value="ikan">
              <Tabel
                kolom={["Jenis Ikan", "Kg Beli", "Kg Jual", "Modal", "Penjualan", "Laba", "Margin"]}
                rows={ikan.map((x) => [
                  x.jenis_ikan,
                  x.kg_beli.toLocaleString("id-ID"),
                  x.kg_jual.toLocaleString("id-ID"),
                  formatRupiah(x.modal),
                  formatRupiah(x.penjualan),
                  formatRupiah(x.laba_kotor),
                  `${x.margin.toFixed(1)}%`,
                ])}
              />
            </TabsContent>
            <TabsContent value="lot">
              <Tabel
                kolom={["LOT", "Kg Beli", "Kg Jual", "Modal", "Penjualan", "Biaya", "Laba Bersih", "Margin"]}
                rows={lot.map((x) => [
                  new Date(x.lot).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  }),
                  x.kg_beli.toLocaleString("id-ID"),
                  x.kg_jual.toLocaleString("id-ID"),
                  formatRupiah(x.modal),
                  formatRupiah(x.penjualan),
                  formatRupiah(x.biaya),
                  formatRupiah(x.laba_bersih),
                  `${x.margin.toFixed(1)}%`,
                ])}
              />
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </AppShell>
  );
}
