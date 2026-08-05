import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, errorResult, jsonResult } from "../supabase";

export default defineTool({
  name: "list_pembelian",
  title: "Daftar pembelian",
  description:
    "Daftar transaksi pembelian ikan dari petani, dengan filter tanggal, status transaksi, dan status bayar.",
  inputSchema: {
    dari_tanggal: z.string().optional().describe("Tanggal awal (YYYY-MM-DD)."),
    sampai_tanggal: z.string().optional().describe("Tanggal akhir (YYYY-MM-DD)."),
    status_transaksi: z
      .enum(["draft", "menunggu", "disetujui", "ditolak"])
      .optional()
      .describe("Filter status alur transaksi."),
    status_bayar: z
      .enum(["belum", "sebagian", "lunas"])
      .optional()
      .describe("Filter status pembayaran."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(200)
      .optional()
      .describe("Jumlah baris maksimum (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("pembelian")
      .select(
        "id, tanggal, jenis_ikan, jumlah_kg, jumlah_mati, harga_per_kg, total_harga, jumlah_dibayar, status_bayar, status_transaksi, catatan, petani:petani_id(nama)",
      )
      .order("tanggal", { ascending: false })
      .limit(input.limit ?? 50);

    if (input.dari_tanggal) query = query.gte("tanggal", input.dari_tanggal);
    if (input.sampai_tanggal) query = query.lte("tanggal", input.sampai_tanggal);
    if (input.status_transaksi) query = query.eq("status_transaksi", input.status_transaksi);
    if (input.status_bayar) query = query.eq("status_bayar", input.status_bayar);

    const { data, error } = await query;
    if (error) return errorResult(error.message);
    return jsonResult(
      (data ?? []).map((row) => ({
        ...row,
        sisa_hutang: Number(row.total_harga ?? 0) - Number(row.jumlah_dibayar ?? 0),
      })),
    );
  },
});
