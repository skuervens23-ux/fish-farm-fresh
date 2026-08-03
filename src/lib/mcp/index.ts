import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listPembelian from "./tools/list-pembelian";
import listPenjualan from "./tools/list-penjualan";
import listMitra from "./tools/list-mitra";
import ringkasanTransaksi from "./tools/ringkasan-transaksi";
import bayarHutang from "./tools/bayar-hutang";

// Must be the direct Supabase host: the publish-time proxy URL fails RFC 8414
// issuer matching. VITE_SUPABASE_PROJECT_ID is inlined at build time.
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "pond-purchase-hub",
  title: "Pond Purchase Hub",
  version: "0.1.0",
  instructions:
    "Alat untuk Bandar Ikan (Pond Purchase Hub): baca transaksi pembelian & penjualan ikan, data petani/pelanggan, ringkasan periode, dan catat pembayaran hutang pembelian. Semua akses mengikuti hak pengguna yang login.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listPembelian, listPenjualan, listMitra, ringkasanTransaksi, bayarHutang],
});
