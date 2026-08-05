import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { TombolEkspor } from "@/components/TombolEkspor";
import { TombolExcelLengkap } from "@/components/TombolExcelLengkap";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRupiah } from "@/lib/format";
import { useTransaksi } from "@/lib/transaksi";
import { useKas } from "@/lib/kas";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { unduhLaporanMingguan, weekKey, weekRangeLabel } from "@/lib/laporan";
import { useUserRole } from "@/hooks/useUserRole";

export const Route = createFileRoute("/_authenticated/laporan")({
  head: () => ({
    meta: [
      { title: "Laporan & Grafik | Bandar Ikan" },
      {
        name: "description",
        content:
          "Laporan keuangan bandar ikan: grafik pembelian vs penjualan, margin, arus kas, dan ekspor laporan mingguan ke Excel.",
      },
      { property: "og:title", content: "Laporan & Grafik Bandar Ikan" },
      {
        property: "og:description",
        content: "Analisis pembelian, penjualan, margin, dan arus kas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LaporanPage,
});

function LaporanPage() {
  const { isOwner } = useUserRole();
  const { data: rows = [], isLoading } = useTransaksi();
  const { data: kas = [] } = useKas();

  const today = new Date();
  const awalDefault = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const [dari, setDari] = useState(awalDefault);
  const [sampai, setSampai] = useState(today.toISOString().slice(0, 10));
  const [fIkan, setFIkan] = useState("semua");
  const [fSupplier, setFSupplier] = useState("semua");
  const [fPembeli, setFPembeli] = useState("semua");

  const { data: operasional = [] } = useQuery({
    queryKey: ["biaya", "laporan", dari, sampai],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("biaya_operasional")
        .select("tanggal, kategori, jumlah")
        .gte("tanggal", dari)
        .lte("tanggal", sampai);
      if (error) throw error;
      return data ?? [];
    },
  });
  const totalOperasional = operasional.reduce((a, r) => a + Number(r.jumlah ?? 0), 0);

  const opsiIkan = useMemo(
    () => Array.from(new Set(rows.map((r) => r.jenis_ikan))).sort(),
    [rows],
  );
  const opsiSupplier = useMemo(
    () =>
      Array.from(new Set(rows.filter((r) => r.jenis === "pembelian").map((r) => r.pihak))).sort(),
    [rows],
  );
  const opsiPembeli = useMemo(
    () =>
      Array.from(new Set(rows.filter((r) => r.jenis === "penjualan").map((r) => r.pihak))).sort(),
    [rows],
  );

  const dipilih = useMemo(
    () =>
      rows.filter(
        (r) =>
          r.status_transaksi !== "draft" &&
          r.tanggal >= dari &&
          r.tanggal <= sampai &&
          (fIkan === "semua" || r.jenis_ikan === fIkan) &&
          (fSupplier === "semua" || r.jenis !== "pembelian" || r.pihak === fSupplier) &&
          (fPembeli === "semua" || r.jenis !== "penjualan" || r.pihak === fPembeli),
      ),
    [rows, dari, sampai, fIkan, fSupplier, fPembeli],
  );
  const kasDipilih = useMemo(
    () => kas.filter((r) => r.tanggal >= dari && r.tanggal <= sampai),
    [kas, dari, sampai],
  );

  const ringkas = useMemo(() => {
    const beli = dipilih.filter((r) => r.jenis === "pembelian");
    const jual = dipilih.filter((r) => r.jenis === "penjualan");
    const totalBeli = beli.reduce((s, r) => s + r.total, 0);
    const totalJual = jual.reduce((s, r) => s + r.total, 0);
    const hutang = beli.reduce((s, r) => s + (r.total - r.dibayar), 0);
    const piutang = jual.reduce((s, r) => s + (r.total - r.dibayar), 0);
    const kasMasuk = kasDipilih.filter((r) => r.tipe === "masuk").reduce((s, r) => s + r.jumlah, 0);
    const kasKeluar = kasDipilih
      .filter((r) => r.tipe === "keluar")
      .reduce((s, r) => s + r.jumlah, 0);
    return {
      totalBeli,
      totalJual,
      margin: totalJual - totalBeli,
      hutang,
      piutang,
      kasMasuk,
      kasKeluar,
      saldoKas: kasMasuk - kasKeluar,
    };
  }, [dipilih, kasDipilih]);

  const harian = useMemo(() => {
    const map = new Map<string, { tanggal: string; pembelian: number; penjualan: number }>();
    for (const r of dipilih) {
      const cur = map.get(r.tanggal) ?? { tanggal: r.tanggal, pembelian: 0, penjualan: 0 };
      if (r.jenis === "pembelian") cur.pembelian += r.total;
      else cur.penjualan += r.total;
      map.set(r.tanggal, cur);
    }
    return Array.from(map.values()).sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  }, [dipilih]);

  const mingguan = useMemo(() => {
    const map = new Map<string, { minggu: string; pembelian: number; penjualan: number }>();
    for (const r of dipilih) {
      const k = weekKey(r.tanggal);
      const cur = map.get(k) ?? { minggu: weekRangeLabel(k), pembelian: 0, penjualan: 0 };
      if (r.jenis === "pembelian") cur.pembelian += r.total;
      else cur.penjualan += r.total;
      map.set(k, cur);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, v]) => v);
  }, [dipilih]);

  const lembarEkspor = () => {
    const beli = dipilih.filter((r) => r.jenis === "pembelian");
    const jual = dipilih.filter((r) => r.jenis === "penjualan");
    return [
      {
        nama: "Ringkasan",
        kolom: ["Metrik", "Nilai"],
        rows: [
          ["Total Pembelian", ringkas.totalBeli],
          ["Total Penjualan", ringkas.totalJual],
          ["Margin", ringkas.margin],
          ["Hutang Supplier", ringkas.hutang],
          ["Piutang Customer", ringkas.piutang],
          ["Kas Masuk", ringkas.kasMasuk],
          ["Kas Keluar", ringkas.kasKeluar],
          ["Saldo Kas", ringkas.saldoKas],
        ] as (string | number)[][],
      },
      {
        nama: "Rekap Mingguan",
        kolom: ["Minggu", "Pembelian", "Penjualan", "Margin"],
        rows: mingguan.map((m) => [
          m.minggu,
          m.pembelian,
          m.penjualan,
          m.penjualan - m.pembelian,
        ]),
      },
      {
        nama: "Rekap Harian",
        kolom: ["Tanggal", "Pembelian", "Penjualan", "Margin"],
        rows: harian.map((d) => [
          d.tanggal,
          d.pembelian,
          d.penjualan,
          d.penjualan - d.pembelian,
        ]),
      },
      {
        nama: "Pembelian",
        kolom: ["Tanggal", "Supplier", "Jenis Ikan", "Total", "Dibayar", "Sisa", "Status"],
        rows: beli.map((r) => [
          r.tanggal,
          r.pihak,
          r.jenis_ikan,
          r.total,
          r.dibayar,
          r.total - r.dibayar,
          r.status_bayar,
        ]),
      },
      {
        nama: "Penjualan",
        kolom: ["Tanggal", "Customer", "Jenis Ikan", "Total", "Dibayar", "Sisa", "Status"],
        rows: jual.map((r) => [
          r.tanggal,
          r.pihak,
          r.jenis_ikan,
          r.total,
          r.dibayar,
          r.total - r.dibayar,
          r.status_bayar,
        ]),
      },
    ];
  };

  async function unduhMingguan() {
    try {
      const beli = dipilih.filter((r) => r.jenis === "pembelian");
      if (beli.length === 0) {
        toast.error("Tidak ada data pembelian pada rentang ini");
        return;
      }
      await unduhLaporanMingguan(
        beli.map((r) => ({
          tanggal: r.tanggal,
          petani: r.pihak,
          jenis_ikan: r.jenis_ikan,
          jumlah_kg: 0,
          harga_per_kg: 0,
          total_harga: r.total,
          jumlah_dibayar: r.dibayar,
          status_bayar: r.status_bayar,
        })),
      );
      toast.success("Laporan mingguan diunduh");
    } catch {
      toast.error("Gagal membuat laporan");
    }
  }

  const kartu = [
    { label: "Total Pembelian", nilai: ringkas.totalBeli, warna: "text-warning" },
    { label: "Total Penjualan", nilai: ringkas.totalJual, warna: "text-success" },
    {
      label: "Margin",
      nilai: ringkas.margin,
      warna: ringkas.margin >= 0 ? "text-success" : "text-destructive",
    },
    { label: "Hutang Petani", nilai: ringkas.hutang, warna: "text-hutang" },
    { label: "Piutang Pelanggan", nilai: ringkas.piutang, warna: "text-hutang" },
    { label: "Saldo Kas", nilai: ringkas.saldoKas, warna: "text-primary" },
    { label: "Total Operasional", nilai: totalOperasional, warna: "text-destructive" },
    {
      label: "Laba Bersih",
      nilai: ringkas.margin - totalOperasional,
      warna: ringkas.margin - totalOperasional >= 0 ? "text-success" : "text-destructive",
    },
  ];

  return (
    <AppShell title="Laporan & Grafik">
      <div className="mx-auto w-full max-w-[1000px] space-y-4 px-4 py-4">
        <Card className="grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="dari">Dari tanggal</Label>
            <Input id="dari" type="date" value={dari} onChange={(e) => setDari(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sampai">Sampai tanggal</Label>
            <Input
              id="sampai"
              type="date"
              value={sampai}
              onChange={(e) => setSampai(e.target.value)}
            />
          </div>
          {isOwner && (
            <>
              <TombolExcelLengkap dari={dari} sampai={sampai} />
              <TombolEkspor
                judul="Laporan Keuangan — ERP Bandar Ikan"
                subjudul={`Periode ${dari} s/d ${sampai}`}
                namaFile={`Laporan-${dari}_sd_${sampai}`}
                data={lembarEkspor}
              />
              <Button variant="ghost" size="sm" onClick={unduhMingguan}>
                <Download className="mr-1.5 h-4 w-4" /> Per Minggu
              </Button>
            </>
          )}
        </Card>

        <Card className="grid gap-3 p-4 sm:grid-cols-3">
          <FilterSelect
            label="Jenis Ikan"
            value={fIkan}
            onChange={setFIkan}
            options={opsiIkan}
            semuaLabel="Semua jenis ikan"
          />
          <FilterSelect
            label="Supplier"
            value={fSupplier}
            onChange={setFSupplier}
            options={opsiSupplier}
            semuaLabel="Semua supplier"
          />
          <FilterSelect
            label="Pembeli"
            value={fPembeli}
            onChange={setFPembeli}
            options={opsiPembeli}
            semuaLabel="Semua pembeli"
          />
        </Card>

        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {kartu.map((k) => (
                <Card key={k.label} className="p-3">
                  <div className="text-[11px] text-muted-foreground">{k.label}</div>
                  <div className={`text-sm font-bold ${k.warna}`}>{formatRupiah(k.nilai)}</div>
                </Card>
              ))}
            </div>

            <Card className="p-4">
              <h2 className="mb-3 text-sm font-semibold">Tren Harian</h2>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={harian}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="tanggal"
                      fontSize={11}
                      tickFormatter={(v: string) => v.slice(5)}
                    />
                    <YAxis
                      fontSize={11}
                      tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                    />
                    <Tooltip formatter={(v: number) => formatRupiah(v)} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="pembelian"
                      name="Pembelian"
                      stroke="hsl(var(--warning, 35 90% 55%))"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="penjualan"
                      name="Penjualan"
                      stroke="hsl(var(--primary, 210 90% 50%))"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-4">
              <h2 className="mb-3 text-sm font-semibold">Perbandingan Mingguan</h2>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mingguan}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="minggu"
                      fontSize={10}
                      tickFormatter={(v: string) => v.slice(0, 6)}
                    />
                    <YAxis
                      fontSize={11}
                      tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                    />
                    <Tooltip formatter={(v: number) => formatRupiah(v)} />
                    <Legend />
                    <Bar
                      dataKey="pembelian"
                      name="Pembelian"
                      fill="hsl(var(--warning, 35 90% 55%))"
                    />
                    <Bar
                      dataKey="penjualan"
                      name="Penjualan"
                      fill="hsl(var(--primary, 210 90% 50%))"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  semuaLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  semuaLabel: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="semua">{semuaLabel}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
