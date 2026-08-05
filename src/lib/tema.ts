import { useCallback, useEffect, useState } from "react";

export type Tema = "light" | "dark";
const KEY = "bandar-ikan-tema";

function terapkan(t: Tema) {
  document.documentElement.classList.toggle("dark", t === "dark");
  document.documentElement.style.colorScheme = t;
}

/** Mode terang/gelap sederhana, tersimpan di perangkat pengguna. */
export function useTema() {
  const [tema, setTema] = useState<Tema>("light");

  useEffect(() => {
    const simpan = window.localStorage.getItem(KEY) as Tema | null;
    const awal: Tema =
      simpan ??
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTema(awal);
    terapkan(awal);
  }, []);

  const ganti = useCallback(() => {
    setTema((prev) => {
      const next: Tema = prev === "dark" ? "light" : "dark";
      window.localStorage.setItem(KEY, next);
      terapkan(next);
      return next;
    });
  }, []);

  return { tema, ganti };
}
