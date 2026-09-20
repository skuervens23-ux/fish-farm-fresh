# Pond Purchase Hub — ERP Bandar Ikan

Aplikasi ERP satu pengguna (Owner) untuk usaha bandar ikan: mencatat pembelian
ikan dari petani, penjualan per LOT, biaya operasional, kas, analisis laba, serta
laporan harian/mingguan dalam format Excel, PDF, dan gambar. Antarmuka berbahasa
Indonesia, mendukung mode terang/gelap, bisa dipasang sebagai PWA, dan mendukung
input transaksi saat offline (tersinkron otomatis ketika online kembali).

## Fitur utama

- **Dashboard** — metrik harian: pembelian, penjualan, laba, kas, hutang, piutang.
- **Pembelian** — input berat (box × kg), faktor box, status bayar, foto nota,
  perhitungan total dihitung ulang di database.
- **Fish LOT & penjualan** — penjualan berbasis LOT pembelian, stok berkurang otomatis.
- **Biaya operasional & kas** — pemasukan/pengeluaran dan arus kas.
- **Analisis profit** — laba kotor, biaya, laba bersih, margin.
- **Laporan** — ekspor Excel (gaya buku besar tulis tangan), PDF, dan gambar,
  dengan pratinjau sebelum unduh.
- **Tanya AI** — asisten chat berbasis konteks data bisnis (opsional).
- **MCP server** — endpoint agent (`/mcp`) dengan autentikasi OAuth Supabase (opsional).

## Stack teknologi

| Lapisan     | Teknologi                                                              |
| ----------- | ---------------------------------------------------------------------- |
| Framework   | TanStack Start v1 (React 19 + SSR) di atas Vite 7                      |
| Routing     | TanStack Router (file-based, `src/routes`)                              |
| Data        | TanStack Query + Supabase JS client                                     |
| Styling     | Tailwind CSS v4 (`src/styles.css`) + shadcn/ui + Radix UI + lucide-react |
| Backend     | Supabase (Postgres, Auth, Storage, RLS) + TanStack server routes        |
| AI          | Vercel AI SDK (`ai`, `@ai-sdk/react`) via gateway kompatibel OpenAI      |
| Laporan     | exceljs, xlsx, jspdf + jspdf-autotable, Canvas API                      |
| Bahasa/Tool | TypeScript, ESLint, Prettier                                            |

## Prasyarat

- Node.js 20+ (atau Bun 1.1+)
- Sebuah proyek Supabase (cloud atau lokal via Supabase CLI)

## Instalasi

```bash
git clone <url-repo-anda>
cd pond-purchase-hub
npm install          # atau: bun install
cp .env.example .env # lalu isi nilai Supabase Anda
```

## Menjalankan secara lokal

```bash
npm run dev          # http://localhost:8080
```

## Build & produksi

```bash
npm run build        # output ke .output/ (server) dan dist/ (client asset)
npm run preview      # menjalankan hasil build secara lokal
```

## Pemeriksaan kualitas / test

```bash
npm run lint         # ESLint
npm run typecheck    # TypeScript (tsc --noEmit)
npm run test         # menjalankan lint + typecheck
npm run format       # Prettier
```

Belum ada unit test otomatis. `npm run test` saat ini menjalankan lint dan
pemeriksaan tipe; tambahkan Vitest bila dibutuhkan suite pengujian sungguhan.

## Struktur folder

```
public/                  ikon PWA, manifest, favicon
src/
  components/            komponen UI aplikasi (form, dialog, shell, sidebar)
    ui/                  komponen dasar shadcn/ui
    ai-elements/         komponen tampilan chat AI
  hooks/                 React hooks (peran pengguna, deteksi mobile)
  integrations/supabase/ client browser, client server, tipe DB (generated)
  lib/                   logika bisnis: laporan, ekspor, analitik, offline, format
    mcp/                 definisi MCP server dan tool-nya
  routes/                halaman (file-based routing)
    _authenticated/      halaman yang butuh login
    api/                 server route (mis. /api/chat)
  styles.css             token desain & tema Tailwind v4
  router.tsx             konfigurasi router
  server.ts, start.ts    entri SSR dan middleware
supabase/
  config.toml            konfigurasi proyek Supabase
  migrations/            seluruh migration SQL (skema, RLS, fungsi, trigger)
  seed.sql               master data contoh (opsional)
vite.config.ts           konfigurasi build
```

## Database

Seluruh skema terdokumentasi sebagai migration SQL di `supabase/migrations/`,
dijalankan berurutan menurut timestamp nama file.

Tabel utama:

| Tabel               | Isi                                                     |
| ------------------- | ------------------------------------------------------- |
| `profiles`          | profil pengguna (terkait `auth.users`)                   |
| `user_roles`        | peran pengguna (`owner`) — terpisah dari profil          |
| `petani`            | data petani/pemasok                                      |
| `pelanggan`         | data pembeli                                             |
| `jenis_ikan`        | master jenis ikan                                        |
| `pembelian`         | transaksi pembelian (total dihitung di database)         |
| `penjualan`         | transaksi penjualan per LOT                              |
| `pembayaran`        | cicilan/pelunasan hutang pembelian                       |
| `biaya_operasional` | biaya operasional & gaji                                 |
| `kas`               | pemasukan/pengeluaran kas                                |
| `pengaturan`        | preferensi aplikasi                                      |
| `percakapan_ai`, `pesan_ai` | riwayat chat AI                                  |

Catatan penting:

- Row Level Security aktif di semua tabel publik; kebijakan mengunci data ke
  pemilik/pencatat data.
- Perhitungan (total harga, sisa stok, laba) dihitung di database melalui kolom
  generated dan fungsi/RPC — jangan dihitung manual di klien.
- Bucket Storage `nota` dipakai untuk foto nota, dengan akses terbatas pemilik.

Menerapkan skema ke proyek Supabase baru:

```bash
npm i -g supabase
supabase link --project-ref <project-ref>
supabase db push            # menerapkan seluruh migration
psql "$DATABASE_URL" -f supabase/seed.sql   # opsional
```

Untuk pengembangan lokal penuh: `supabase start` lalu `supabase db reset`
(otomatis menjalankan migration + `seed.sql`).

Regenerasi tipe TypeScript setelah mengubah skema:

```bash
supabase gen types typescript --project-id <project-ref> > src/integrations/supabase/types.ts
```

## Environment variable

Lihat `.env.example`. Ringkasan:

| Variabel                              | Wajib | Keterangan                                       |
| ------------------------------------- | ----- | ------------------------------------------------ |
| `SUPABASE_URL` / `VITE_SUPABASE_URL`  | ya    | URL proyek Supabase                               |
| `SUPABASE_PUBLISHABLE_KEY` / `VITE_…` | ya    | publishable/anon key (aman untuk browser)         |
| `SUPABASE_PROJECT_ID` / `VITE_…`      | ya    | project ref, dipakai issuer OAuth MCP             |
| `SUPABASE_SERVICE_ROLE_KEY`           | tidak | hanya server, untuk operasi admin (rahasia penuh) |
| `LOVABLE_API_KEY`                     | tidak | kunci gateway AI untuk fitur "Tanya AI"           |

Aturan: tidak ada API key, password, atau token yang ditulis di dalam kode.
Semua dibaca dari environment variable. File `.env` masuk `.gitignore`.

Fitur AI memakai gateway yang kompatibel dengan API OpenAI. Untuk berpindah
penyedia, ubah `baseURL`, header, dan nama model pada
`src/lib/ai-gateway.server.ts` serta `src/routes/api/chat.ts`.

## Deployment

Build menghasilkan server Nitro dengan target default Cloudflare Workers.

1. Set semua environment variable pada platform tujuan (jangan commit `.env`).
2. Jalankan `npm run build`.
3. Deploy isi `.output/` sesuai platform:
   - **Cloudflare Workers/Pages** — target bawaan, deploy `.output/`.
   - **Node/VPS** — ubah target Nitro di `vite.config.ts` menjadi `node-server`,
     lalu jalankan `node .output/server/index.mjs`.
   - **Vercel / Netlify** — ubah target Nitro ke preset yang sesuai.
4. Supabase (database, auth, storage) berjalan terpisah dan tidak perlu
   di-deploy ulang.

## Catatan portabilitas

- Aplikasi tidak bergantung pada runtime Lovable. Semua konfigurasi melalui
  environment variable dan Supabase standar.
- `@lovable.dev/vite-tanstack-config` adalah paket npm publik berisi preset Vite
  (TanStack Start, React, Tailwind, tsconfig paths, Nitro). Bisa diganti dengan
  konfigurasi Vite manual bila diinginkan.
- `@lovable.dev/mcp-js` hanya dipakai untuk endpoint MCP opsional di
  `src/lib/mcp/` dan `src/routes/mcp.ts`. Hapus folder tersebut, route MCP, dan
  `mcpPlugin()` di `vite.config.ts` jika fitur agent tidak diperlukan.
- Folder `.lovable/` hanya metadata editor dan boleh dihapus.

## Lisensi

Proprietary — penggunaan internal.
