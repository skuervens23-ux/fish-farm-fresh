import { supabase } from "@/integrations/supabase/client";

export const TABEL_BACKUP = [
  "profiles",
  "user_roles",
  "petani",
  "pelanggan",
  "pembelian",
  "penjualan",
  "pembayaran",
  "kas",
  "pengaturan",
] as const;

export type NamaTabel = (typeof TABEL_BACKUP)[number];

export type FileBackup = {
  aplikasi: "bandar-ikan";
  versi: 1;
  dibuat_pada: string;
  data: Partial<Record<NamaTabel, Record<string, unknown>[]>>;
};

/** Ambil seluruh data yang boleh dibaca pengguna saat ini, lalu kembalikan sebagai objek backup. */
export async function buatBackup(): Promise<FileBackup> {
  const data: FileBackup["data"] = {};
  for (const tabel of TABEL_BACKUP) {
    // Kolom kontak petani/pelanggan hanya bisa dibaca owner lewat fungsi khusus.
    if (tabel === "petani" || tabel === "pelanggan") {
      const [list, kontak] = await Promise.all([
        supabase.from(tabel).select("id, nama, is_active, created_by, created_at"),
        supabase.rpc(tabel === "petani" ? "kontak_petani" : "kontak_pelanggan"),
      ]);
      if (list.error) throw new Error(`${tabel}: ${list.error.message}`);
      const map = new Map((kontak.data ?? []).map((k) => [k.id, k]));
      data[tabel] = (list.data ?? []).map((row) => ({
        ...row,
        telepon: map.get(row.id)?.telepon ?? null,
        alamat: map.get(row.id)?.alamat ?? null,
      }));
      continue;
    }
    const { data: rows, error } = await supabase.from(tabel).select("*");
    if (error) throw new Error(`${tabel}: ${error.message}`);
    data[tabel] = (rows ?? []) as Record<string, unknown>[];
  }
  return {
    aplikasi: "bandar-ikan",
    versi: 1,
    dibuat_pada: new Date().toISOString(),
    data,
  };
}


export function unduhBackup(backup: FileBackup) {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `backup-bandar-ikan-${backup.dibuat_pada.slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Tabel yang aman dipulihkan dari sisi aplikasi (master data & kas). */
const TABEL_RESTORE: NamaTabel[] = ["petani", "pelanggan", "kas", "pengaturan"];

export async function pulihkanBackup(backup: FileBackup): Promise<Record<string, number>> {
  if (backup.aplikasi !== "bandar-ikan") throw new Error("File backup tidak dikenali");
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) throw new Error("Belum login");

  const hasil: Record<string, number> = {};
  for (const tabel of TABEL_RESTORE) {
    const rows = backup.data[tabel];
    if (!rows || rows.length === 0) continue;
    const payload = rows.map((r) => {
      const row = { ...r };
      if (tabel === "petani" || tabel === "pelanggan") row.created_by = uid;
      if (tabel === "kas") row.dicatat_oleh = uid;
      return row;
    });
    const { error } = await supabase
      .from(tabel)
      .upsert(payload as never, { onConflict: tabel === "pengaturan" ? "key" : "id" });
    if (error) throw new Error(`${tabel}: ${error.message}`);
    hasil[tabel] = payload.length;
  }
  return hasil;
}
