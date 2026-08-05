import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type JenisAntrian = "pembelian" | "penjualan";

export type ItemAntrian = {
  id: string;
  jenis: JenisAntrian;
  ringkas: string;
  payload: Record<string, unknown>;
  dibuat_pada: string;
  percobaan: number;
  error?: string;
};

const KEY = "bandar-ikan-antrian-offline";
const EVENT = "antrian-offline-berubah";

function bacaStorage(): ItemAntrian[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as ItemAntrian[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function tulisStorage(items: ItemAntrian[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function ambilAntrian(): ItemAntrian[] {
  return bacaStorage();
}

export function tambahAntrian(
  jenis: JenisAntrian,
  ringkas: string,
  payload: Record<string, unknown>,
): ItemAntrian {
  const item: ItemAntrian = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : String(Date.now() + Math.random()),
    jenis,
    ringkas,
    payload,
    dibuat_pada: new Date().toISOString(),
    percobaan: 0,
  };
  tulisStorage([...bacaStorage(), item]);
  return item;
}

export function hapusAntrian(id: string) {
  tulisStorage(bacaStorage().filter((i) => i.id !== id));
}

export function sedangOffline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

let sedangSinkron = false;

/** Kirim semua transaksi yang tertahan. Aman dipanggil berulang. */
export async function sinkronAntrian(): Promise<{ sukses: number; gagal: number }> {
  if (sedangSinkron || sedangOffline()) return { sukses: 0, gagal: 0 };
  sedangSinkron = true;
  let sukses = 0;
  let gagal = 0;
  try {
    for (const item of bacaStorage()) {
      const rpc = item.jenis === "pembelian" ? "create_pembelian" : "create_penjualan";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.rpc(rpc as any, item.payload as any);
      if (error) {
        gagal += 1;
        tulisStorage(
          bacaStorage().map((i) =>
            i.id === item.id ? { ...i, percobaan: i.percobaan + 1, error: error.message } : i,
          ),
        );
        // Koneksi masih bermasalah: hentikan, coba lagi nanti.
        if (sedangOffline()) break;
      } else {
        sukses += 1;
        hapusAntrian(item.id);
      }
    }
  } finally {
    sedangSinkron = false;
  }
  return { sukses, gagal };
}

/** Status koneksi + jumlah transaksi tertahan, dengan sinkronisasi otomatis. */
export function useAntrianOffline() {
  const [online, setOnline] = useState(true);
  const [items, setItems] = useState<ItemAntrian[]>([]);
  const [menyinkron, setMenyinkron] = useState(false);

  const refresh = useCallback(() => setItems(bacaStorage()), []);

  const sinkron = useCallback(async () => {
    if (bacaStorage().length === 0) return { sukses: 0, gagal: 0 };
    setMenyinkron(true);
    const hasil = await sinkronAntrian();
    setMenyinkron(false);
    refresh();
    return hasil;
  }, [refresh]);

  useEffect(() => {
    setOnline(navigator.onLine);
    refresh();

    const onOnline = () => {
      setOnline(true);
      void sinkron();
    };
    const onOffline = () => setOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener(EVENT, refresh);
    const timer = window.setInterval(() => {
      if (navigator.onLine) void sinkron();
    }, 30_000);

    if (navigator.onLine) void sinkron();

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener(EVENT, refresh);
      window.clearInterval(timer);
    };
  }, [refresh, sinkron]);

  return { online, items, jumlah: items.length, menyinkron, sinkron, refresh };
}

/** Deteksi error yang disebabkan koneksi, bukan validasi bisnis. */
export function kesalahanJaringan(error: unknown): boolean {
  const msg = (
    typeof error === "string" ? error : ((error as { message?: string })?.message ?? "")
  ).toLowerCase();
  return (
    sedangOffline() ||
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("network request failed") ||
    msg.includes("load failed") ||
    msg.includes("timeout") ||
    msg.includes("fetch failed")
  );
}
