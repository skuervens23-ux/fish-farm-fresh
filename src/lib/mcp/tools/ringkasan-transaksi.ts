import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, errorResult, jsonResult } from "../supabase";

export default defineTool({
  name: "ringkasan_transaksi",
  title: "Ringkasan transaksi",
  description:
    "Ringkasan pembelian dan penjualan pada rentang tanggal: total kg, total rupiah, total dibayar, sisa hutang/piutang.",
  inputSchema: {
    dari_tanggal: z.string().describe("Tanggal awal (YYYY-MM-DD)."),
    sampai_tanggal: z.string().describe("Tanggal akhir (YYYY-MM-DD)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ dari_tanggal, sampai_tanggal }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);

    const [beli, jual] = await Promise.all([
      supabase
        .from("pembelian")
        .select("jumlah_kg, total_harga, jumlah_dibayar")
        .gte("tanggal", dari_tanggal)
        .lte("tanggal", sampai_tanggal),
      supabase
        .from("penjualan")
        .select("berat_kg, total_harga, jumlah_dibayar")
        .gte("tanggal", dari_tanggal)
        .lte("tanggal", sampai_tanggal),
    ]);

    if (beli.error) return errorResult(beli.error.message);
    if (jual.error) return errorResult(jual.error.message);

    const sum = (rows: Array<Record<string, unknown>>, key: string) =>
      rows.reduce((acc, row) => acc + Number(row[key] ?? 0), 0);

    const b = (beli.data ?? []) as Array<Record<string, unknown>>;
    const j = (jual.data ?? []) as Array<Record<string, unknown>>;
    const totalBeli = sum(b, "total_harga");
    const dibayarBeli = sum(b, "jumlah_dibayar");
    const totalJual = sum(j, "total_harga");
    const dibayarJual = sum(j, "jumlah_dibayar");

    return jsonResult({
      periode: { dari: dari_tanggal, sampai: sampai_tanggal },
      pembelian: {
        jumlah_transaksi: b.length,
        total_kg: sum(b, "jumlah_kg"),
        total_rupiah: totalBeli,
        total_dibayar: dibayarBeli,
        sisa_hutang: totalBeli - dibayarBeli,
      },
      penjualan: {
        jumlah_transaksi: j.length,
        total_kg: sum(j, "berat_kg"),
        total_rupiah: totalJual,
        total_dibayar: dibayarJual,
        sisa_piutang: totalJual - dibayarJual,
      },
      margin_kotor: totalJual - totalBeli,
    });
  },
});
