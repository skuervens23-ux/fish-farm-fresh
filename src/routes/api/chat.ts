import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider, getLovableAiGatewayRunId } from "@/lib/ai-gateway.server";
import type { Database } from "@/integrations/supabase/types";

type Body = { messages?: UIMessage[]; percakapanId?: string };

function teksDari(message: UIMessage) {
  return message.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("")
    .trim();
}

const rupiah = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer /i, "");
        if (!token) return new Response("Belum login", { status: 401 });

        const supabase = createClient<Database>(
          process.env["SUPABASE_URL"]!,
          process.env["SUPABASE_PUBLISHABLE_KEY"]!,
          {
            auth: { persistSession: false, autoRefreshToken: false },
            global: { headers: { Authorization: `Bearer ${token}` } },
          },
        );

        const { data: userData } = await supabase.auth.getUser(token);
        const user = userData.user;
        if (!user) return new Response("Sesi tidak valid", { status: 401 });

        const { messages, percakapanId } = (await request.json()) as Body;
        if (!Array.isArray(messages)) return new Response("Pesan tidak valid", { status: 400 });

        if (percakapanId) {
          const { data: thread } = await supabase
            .from("percakapan_ai")
            .select("id")
            .eq("id", percakapanId)
            .eq("user_id", user.id)
            .maybeSingle();
          if (!thread) return new Response("Percakapan tidak ditemukan", { status: 404 });
        }

        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return new Response("AI belum dikonfigurasi", { status: 500 });

        // Konteks bisnis ringkas agar jawaban AI relevan dengan data pengguna.
        const [beli, jual, kas] = await Promise.all([
          supabase
            .from("pembelian")
            .select("tanggal, jenis_ikan, total_harga, jumlah_dibayar, status_transaksi, status_bayar")
            .order("tanggal", { ascending: false })
            .limit(80),
          supabase
            .from("penjualan")
            .select("tanggal, jenis_ikan, total_harga, jumlah_dibayar, status_transaksi, status_bayar")
            .order("tanggal", { ascending: false })
            .limit(80),
          supabase.from("kas").select("tanggal, tipe, kategori, jumlah").order("tanggal", { ascending: false }).limit(80),
        ]);

        const b = beli.data ?? [];
        const j = jual.data ?? [];
        const k = kas.data ?? [];
        const hari = new Date().toISOString().slice(0, 10);
        const sum = (arr: Array<Record<string, unknown>>, f: (r: never) => number) =>
          arr.reduce((s, r) => s + f(r as never), 0);

        const hutang = sum(
          b.filter((r) => r.status_transaksi === "disetujui"),
          (r: { total_harga: number | null; jumlah_dibayar: number | null }) =>
            Math.max(0, Number(r.total_harga ?? 0) - Number(r.jumlah_dibayar ?? 0)),
        );
        const piutang = sum(
          j.filter((r) => r.status_transaksi === "disetujui"),
          (r: { total_harga: number | null; jumlah_dibayar: number | null }) =>
            Math.max(0, Number(r.total_harga ?? 0) - Number(r.jumlah_dibayar ?? 0)),
        );
        const beliHariIni = sum(
          b.filter((r) => r.tanggal === hari),
          (r: { total_harga: number | null }) => Number(r.total_harga ?? 0),
        );
        const jualHariIni = sum(
          j.filter((r) => r.tanggal === hari),
          (r: { total_harga: number | null }) => Number(r.total_harga ?? 0),
        );
        const saldoKas = k.reduce(
          (s, r) => s + (r.tipe === "masuk" ? Number(r.jumlah) : -Number(r.jumlah)),
          0,
        );

        const system = `Kamu adalah asisten AI untuk aplikasi bandar ikan berbahasa Indonesia.
Jawab singkat, praktis, dan gunakan format Rupiah. Jika data tidak cukup, katakan apa adanya.

Ringkasan data pengguna (tanggal hari ini ${hari}):
- Pembelian hari ini: ${rupiah(beliHariIni)} (${b.filter((r) => r.tanggal === hari).length} transaksi)
- Penjualan hari ini: ${rupiah(jualHariIni)} (${j.filter((r) => r.tanggal === hari).length} transaksi)
- Perkiraan laba hari ini: ${rupiah(jualHariIni - beliHariIni)}
- Saldo kas: ${rupiah(saldoKas)}
- Hutang ke petani: ${rupiah(hutang)}
- Piutang dari pelanggan: ${rupiah(piutang)}
- Transaksi menunggu persetujuan: ${
          b.filter((r) => r.status_transaksi === "menunggu").length +
          j.filter((r) => r.status_transaksi === "menunggu").length
        }`;

        const gateway = createLovableAiGatewayProvider(key, getLovableAiGatewayRunId(request));
        const result = streamText({
          model: gateway("google/gemini-3.6-flash"),
          system,
          messages: await convertToModelMessages(messages),
        });

        // Simpan pesan pengguna terakhir.
        if (percakapanId) {
          const terakhir = messages[messages.length - 1];
          if (terakhir?.role === "user") {
            const { error } = await supabase.from("pesan_ai").insert({
              percakapan_id: percakapanId,
              user_id: user.id,
              peran: "user",
              isi: { parts: terakhir.parts } as unknown as never,
            });
            if (error) console.error("Gagal simpan pesan pengguna:", error.message);
            const judul = teksDari(terakhir).slice(0, 60);
            if (judul) {
              const { count } = await supabase
                .from("pesan_ai")
                .select("id", { count: "exact", head: true })
                .eq("percakapan_id", percakapanId);
              if ((count ?? 0) <= 1) {
                await supabase.from("percakapan_ai").update({ judul }).eq("id", percakapanId);
              }
            }
          }
        }

        return result.toUIMessageStreamResponse({
          originalMessages: messages,
          onFinish: async ({ responseMessage }) => {
            if (!percakapanId || !responseMessage) return;
            const { error } = await supabase.from("pesan_ai").insert({
              percakapan_id: percakapanId,
              user_id: user.id,
              peran: "assistant",
              isi: { parts: responseMessage.parts } as unknown as never,
            });
            if (error) console.error("Gagal simpan jawaban AI:", error.message);
            await supabase
              .from("percakapan_ai")
              .update({ updated_at: new Date().toISOString() })
              .eq("id", percakapanId);
          },
        });
      },
    },
  },
});
