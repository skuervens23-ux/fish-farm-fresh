/**
 * Terjemahkan error teknis (Postgres/Supabase/jaringan) menjadi pesan
 * yang mudah dipahami pengguna. Detail teknis tetap dicatat ke console
 * agar bisa ditelusuri, tapi tidak pernah ditampilkan mentah di UI.
 */
export function pesanError(
  err: unknown,
  fallback = "Terjadi kesalahan. Silakan coba lagi.",
): string {
  const raw =
    typeof err === "string"
      ? err
      : err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : "";

  if (import.meta.env.DEV) console.error("[app-error]", err);

  const t = raw.toLowerCase();

  if (!navigator.onLine || t.includes("failed to fetch") || t.includes("networkerror")) {
    return "Koneksi internet terputus. Periksa jaringan lalu coba lagi.";
  }
  if (t.includes("jwt") || t.includes("not authenticated") || t.includes("401")) {
    return "Sesi Anda sudah berakhir. Silakan masuk kembali.";
  }
  if (t.includes("row-level security") || t.includes("permission denied") || t.includes("403")) {
    return "Anda tidak punya izin untuk tindakan ini.";
  }
  if (t.includes("duplicate key") || t.includes("unique constraint")) {
    return "Data serupa sudah ada. Periksa kembali isian Anda.";
  }
  if (t.includes("foreign key")) {
    return "Data terkait tidak ditemukan atau masih dipakai transaksi lain.";
  }
  if (t.includes("timeout") || t.includes("timed out")) {
    return "Server lama merespons. Coba lagi sebentar lagi.";
  }

  // Pesan RAISE EXCEPTION dari fungsi database sudah berbahasa Indonesia
  // dan aman ditampilkan apa adanya.
  if (
    raw &&
    /[a-z]/i.test(raw) &&
    raw.length <= 160 &&
    !t.includes("error:") &&
    !t.includes("sql")
  ) {
    return raw;
  }
  return fallback;
}
