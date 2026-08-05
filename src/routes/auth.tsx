import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";

/** Akun tunggal pemilik aplikasi — pengguna cukup memasukkan password. */
const OWNER_EMAIL = "skuervens23@gmail.com";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Masuk — Pembelian Ikan" },
      {
        name: "description",
        content: "Masukkan password untuk membuka aplikasi pembelian ikan hidup.",
      },
      { property: "og:title", content: "Masuk — Pembelian Ikan" },
      {
        property: "og:description",
        content: "Masukkan password untuk membuka aplikasi pembelian ikan hidup.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { next?: string } =>
    typeof search.next === "string" && search.next.startsWith("/") ? { next: search.next } : {},
  component: AuthPage,
});

const passwordSchema = z.string().min(6, "Password minimal 6 karakter").max(72);

function AuthPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const [loading, setLoading] = useState(false);

  function lanjut() {
    if (next) {
      window.location.href = next;
      return;
    }
    navigate({ to: "/pembelian", replace: true });
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        if (next) window.location.href = next;
        else navigate({ to: "/pembelian", replace: true });
      }
    });
  }, [navigate, next]);

  function translateAuthError(msg: string): string {
    const m = msg.toLowerCase();
    if (m.includes("invalid login")) return "Password salah.";
    if (m.includes("rate limit")) return "Terlalu banyak percobaan. Coba lagi beberapa saat.";
    if (m.includes("network")) return "Koneksi bermasalah. Periksa internet Anda.";
    return msg;
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const passR = passwordSchema.safeParse(form.get("password"));
    if (!passR.success) return toast.error(passR.error.issues[0].message);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: OWNER_EMAIL,
      password: passR.data,
    });
    setLoading(false);
    if (error) return toast.error(translateAuthError(error.message));
    toast.success("Berhasil masuk.");
    lanjut();
  }

  return (
    <div className="bg-app flex min-h-screen items-center justify-center p-4">
      <Card className="surface-card w-full max-w-[420px]">
        <CardHeader>
          <CardTitle>Pembelian Ikan</CardTitle>
          <CardDescription>Masukkan password untuk membuka aplikasi.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                name="password"
                type="password"
                required
                autoFocus
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="h-12 w-full" disabled={loading}>
              {loading ? "Memproses…" : "Masuk"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            <Link to="/" className="hover:underline">
              ← Kembali
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
