import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { FormPembelian } from "@/components/FormPembelian";

export const Route = createFileRoute("/_authenticated/pembelian/baru")({
  component: PembelianBaru,
});

function PembelianBaru() {
  return (
    <main className="min-h-screen bg-muted/40 pb-10">
      <header className="sticky top-0 z-10 border-b border-border bg-background">
        <div className="mx-auto flex max-w-[420px] items-center gap-2 px-4 py-3">
          <Link
            to="/pembelian"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-accent"
            aria-label="Kembali"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-semibold text-foreground">Pembelian Baru</h1>
        </div>
      </header>
      <div className="px-4 pt-6">
        <FormPembelian />
      </div>
    </main>
  );
}
