import { createFileRoute } from "@tanstack/react-router";
import { FormPenjualan } from "@/components/FormPenjualan";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/penjualan/baru")({
  head: () => ({
    meta: [
      { title: "Input Penjualan Ikan | Bandar Ikan" },
      {
        name: "description",
        content: "Catat penjualan ikan ke pelanggan lengkap dengan berat, grade, bukti timbangan dan nota.",
      },
      { property: "og:title", content: "Input Penjualan Ikan" },
      { property: "og:description", content: "Form pencatatan penjualan ikan untuk mandor lapangan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PenjualanBaru,
});

function PenjualanBaru() {
  return (
    <AppShell title="Input Penjualan" backTo="/riwayat">
      <div className="px-4 py-6">
        <FormPenjualan />
      </div>
    </AppShell>
  );
}
