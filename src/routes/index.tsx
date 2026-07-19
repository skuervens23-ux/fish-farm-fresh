import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pembelian Ikan Hidup — Catat Transaksi Harian" },
      {
        name: "description",
        content:
          "Aplikasi pencatatan pembelian ikan hidup dari petani: total otomatis, status pembayaran, dan hutang tercatat rapi.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/pembelian", replace: true });
      else setChecking(false);
    });
  }, [navigate]);

  if (checking) return null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-[420px] text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Pembelian Ikan</h1>
        <p className="mt-3 text-muted-foreground">
          Catat pembelian ikan hidup dari petani, hitung total otomatis, dan pantau hutang.
        </p>
        <div className="mt-8">
          <Button asChild size="lg" className="h-12 w-full">
            <Link to="/auth">Masuk</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
