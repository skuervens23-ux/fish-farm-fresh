import { createFileRoute } from "@tanstack/react-router";
import { FormPembelian } from "@/components/FormPembelian";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/pembelian/baru")({
  head: () => ({
    meta: [
      { title: "Input Pembelian Ikan | Bandar Ikan" },
      {
        name: "description",
        content: "Catat pembelian ikan dari petani lengkap dengan status bayar, foto nota, dan catatan.",
      },
      { property: "og:title", content: "Input Pembelian Ikan" },
      { property: "og:description", content: "Form pencatatan pembelian ikan dari petani." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PembelianBaru,
});

function PembelianBaru() {
  return (
    <AppShell title="Input Pembelian" backTo="/riwayat">
      <div className="px-4 py-6">
        <FormPembelian />
      </div>
    </AppShell>
  );
}
