import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Masuk — Pembelian Ikan" },
      { name: "description", content: "Masuk atau daftar untuk mengelola pembelian ikan hidup dari petani." },
    ],
  }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email("Email tidak valid").max(255);
const passwordSchema = z.string().min(6, "Password minimal 6 karakter").max(72);
const namaSchema = z.string().trim().min(2, "Nama minimal 2 karakter").max(80);

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/pembelian", replace: true });
    });
  }, [navigate]);

  function translateAuthError(msg: string): string {
    const m = msg.toLowerCase();
    if (m.includes("invalid login")) return "Email atau password salah.";
    if (m.includes("email not confirmed")) return "Email belum dikonfirmasi. Silakan daftar ulang atau hubungi admin.";
    if (m.includes("user already registered") || m.includes("already registered")) return "Email sudah terdaftar. Silakan masuk.";
    if (m.includes("weak_password") || m.includes("weak password") || m.includes("pwned")) return "Password terlalu lemah. Gunakan kombinasi huruf, angka, dan simbol.";
    if (m.includes("rate limit")) return "Terlalu banyak percobaan. Coba lagi beberapa saat.";
    if (m.includes("network")) return "Koneksi bermasalah. Periksa internet Anda.";
    return msg;
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const emailR = emailSchema.safeParse(form.get("email"));
    const passR = passwordSchema.safeParse(form.get("password"));
    if (!emailR.success) return toast.error(emailR.error.issues[0].message);
    if (!passR.success) return toast.error(passR.error.issues[0].message);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: emailR.data,
      password: passR.data,
    });
    setLoading(false);
    if (error) return toast.error(translateAuthError(error.message));
    toast.success("Berhasil masuk.");
    navigate({ to: "/pembelian", replace: true });
  }

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const emailR = emailSchema.safeParse(form.get("email"));
    const passR = passwordSchema.safeParse(form.get("password"));
    const namaR = namaSchema.safeParse(form.get("nama"));
    if (!namaR.success) return toast.error(namaR.error.issues[0].message);
    if (!emailR.success) return toast.error(emailR.error.issues[0].message);
    if (!passR.success) return toast.error(passR.error.issues[0].message);
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: emailR.data,
      password: passR.data,
      options: {
        emailRedirectTo: window.location.origin,
        data: { nama: namaR.data },
      },
    });
    if (error) {
      setLoading(false);
      return toast.error(translateAuthError(error.message));
    }
    // Auto-confirm aktif → langsung ada session. Jika belum, coba sign-in otomatis.
    if (!data.session) {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: emailR.data,
        password: passR.data,
      });
      if (signInErr) {
        setLoading(false);
        return toast.error(translateAuthError(signInErr.message));
      }
    }
    setLoading(false);
    toast.success("Akun dibuat. Selamat datang!");
    navigate({ to: "/pembelian", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-[420px]">
        <CardHeader>
          <CardTitle>Pembelian Ikan</CardTitle>
          <CardDescription>Masuk untuk mencatat pembelian dari petani.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Masuk</TabsTrigger>
              <TabsTrigger value="signup">Daftar</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input id="login-email" name="email" type="email" required autoComplete="email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input id="login-password" name="password" type="password" required autoComplete="current-password" />
                </div>
                <Button type="submit" className="h-12 w-full" disabled={loading}>
                  {loading ? "Memproses…" : "Masuk"}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-nama">Nama</Label>
                  <Input id="signup-nama" name="nama" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input id="signup-email" name="email" type="email" required autoComplete="email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input id="signup-password" name="password" type="password" required autoComplete="new-password" minLength={6} />
                </div>
                <Button type="submit" className="h-12 w-full" disabled={loading}>
                  {loading ? "Memproses…" : "Daftar"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            <Link to="/" className="hover:underline">← Kembali</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
