import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauthenticated, errorResult, jsonResult } from "../supabase";

export default defineTool({
  name: "list_mitra",
  title: "Daftar petani & pelanggan",
  description: "Daftar data master mitra: petani (pemasok) atau pelanggan (pembeli).",
  inputSchema: {
    tipe: z.enum(["petani", "pelanggan"]).describe("Jenis mitra yang ingin ditampilkan."),
    cari: z.string().optional().describe("Kata kunci nama mitra."),
    hanya_aktif: z.boolean().optional().describe("Hanya tampilkan mitra aktif (default true)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from(input.tipe)
      .select("id, nama, is_active")
      .order("nama", { ascending: true })
      .limit(200);
    if (input.hanya_aktif !== false) query = query.eq("is_active", true);
    if (input.cari) query = query.ilike("nama", `%${input.cari}%`);

    const { data, error } = await query;
    if (error) return errorResult(error.message);
    return jsonResult(data ?? []);
  },
});
