import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, errorResult, jsonResult } from "../supabase";

export default defineTool({
  name: "bayar_hutang_pembelian",
  title: "Bayar hutang pembelian",
  description:
    "Catat pembayaran sisa hutang untuk satu transaksi pembelian. Jumlah tidak boleh melebihi sisa hutang.",
  inputSchema: {
    pembelian_id: z.string().uuid().describe("ID transaksi pembelian."),
    jumlah: z.number().positive().describe("Nominal pembayaran dalam rupiah."),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler: async ({ pembelian_id, jumlah }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase.rpc("bayar_hutang", {
      _pembelian_id: pembelian_id,
      _jumlah: jumlah,
    });
    if (error) return errorResult(error.message);
    return jsonResult(data);
  },
});
