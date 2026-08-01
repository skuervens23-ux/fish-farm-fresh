import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { DaftarTransaksi } from "./riwayat";
import { useTransaksi } from "@/lib/transaksi";

export const Route = createFileRoute("/_authenticated/draft")({
  head: () => ({
    meta: [
      { title: "Draft Transaksi | Bandar Ikan" },
      {
        name: "description",
        content: "Transaksi yang masih tersimpan sebagai draft dan belum dikirim ke admin untuk disetujui.",
      },
      { property: "og:title", content: "Draft Transaksi" },
      { property: "og:description", content: "Daftar transaksi draft milik Anda." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DraftPage,
});

function DraftPage() {
  const { data: rows = [], isLoading } = useTransaksi();
  const { data: uid } = useQuery({
    queryKey: ["uid"],
    queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null,
  });

  const drafts = useMemo(
    () => rows.filter((r) => r.status_transaksi === "draft" && (!uid || r.dicatat_oleh === uid)),
    [rows, uid],
  );

  return (
    <AppShell title="Draft">
      <div className="mx-auto w-full max-w-[900px] space-y-4 px-4 py-4">
        <p className="text-sm text-muted-foreground">
          Draft hanya tersimpan sementara. Buka detail lalu kirim ke admin agar diproses.
        </p>
        <DaftarTransaksi rows={drafts} isLoading={isLoading} kosong="Belum ada draft." />
      </div>
    </AppShell>
  );
}
