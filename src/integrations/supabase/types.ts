export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      biaya_operasional: {
        Row: {
          created_at: string
          dicatat_oleh: string
          harga_per_balok: number | null
          id: string
          jumlah: number
          jumlah_balok: number | null
          kategori: string
          keterangan: string | null
          tanggal: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dicatat_oleh: string
          harga_per_balok?: number | null
          id?: string
          jumlah: number
          jumlah_balok?: number | null
          kategori?: string
          keterangan?: string | null
          tanggal?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dicatat_oleh?: string
          harga_per_balok?: number | null
          id?: string
          jumlah?: number
          jumlah_balok?: number | null
          kategori?: string
          keterangan?: string | null
          tanggal?: string
          updated_at?: string
        }
        Relationships: []
      }
      jenis_ikan: {
        Row: {
          catatan: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          nama: string
          updated_at: string
        }
        Insert: {
          catatan?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          nama: string
          updated_at?: string
        }
        Update: {
          catatan?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          nama?: string
          updated_at?: string
        }
        Relationships: []
      }
      kas: {
        Row: {
          created_at: string
          dicatat_oleh: string
          id: string
          jumlah: number
          kategori: string
          keterangan: string | null
          tanggal: string
          tipe: Database["public"]["Enums"]["tipe_kas"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          dicatat_oleh: string
          id?: string
          jumlah: number
          kategori?: string
          keterangan?: string | null
          tanggal?: string
          tipe: Database["public"]["Enums"]["tipe_kas"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          dicatat_oleh?: string
          id?: string
          jumlah?: number
          kategori?: string
          keterangan?: string | null
          tanggal?: string
          tipe?: Database["public"]["Enums"]["tipe_kas"]
          updated_at?: string
        }
        Relationships: []
      }
      pelanggan: {
        Row: {
          alamat: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          nama: string
          telepon: string | null
          updated_at: string
        }
        Insert: {
          alamat?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          nama: string
          telepon?: string | null
          updated_at?: string
        }
        Update: {
          alamat?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          nama?: string
          telepon?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pembayaran: {
        Row: {
          created_at: string
          dicatat_oleh: string
          id: string
          jumlah: number
          metode: Database["public"]["Enums"]["metode_pembayaran"]
          referensi_id: string
          tipe: Database["public"]["Enums"]["tipe_pembayaran"]
        }
        Insert: {
          created_at?: string
          dicatat_oleh: string
          id?: string
          jumlah: number
          metode?: Database["public"]["Enums"]["metode_pembayaran"]
          referensi_id: string
          tipe: Database["public"]["Enums"]["tipe_pembayaran"]
        }
        Update: {
          created_at?: string
          dicatat_oleh?: string
          id?: string
          jumlah?: number
          metode?: Database["public"]["Enums"]["metode_pembayaran"]
          referensi_id?: string
          tipe?: Database["public"]["Enums"]["tipe_pembayaran"]
        }
        Relationships: []
      }
      pembelian: {
        Row: {
          alasan_tolak: string | null
          box: number
          catatan: string | null
          created_at: string
          dicatat_oleh: string
          ditinjau_oleh: string | null
          ditinjau_pada: string | null
          faktor_box: number
          foto_nota_url: string | null
          harga_per_kg: number
          id: string
          jenis_ikan: string
          jumlah_dibayar: number
          jumlah_kg: number
          jumlah_mati: number
          petani_id: string
          sisa_kg: number
          status_bayar: Database["public"]["Enums"]["status_bayar"]
          status_pengiriman: Database["public"]["Enums"]["status_pengiriman"]
          status_transaksi: Database["public"]["Enums"]["status_transaksi"]
          tanggal: string
          total_harga: number | null
        }
        Insert: {
          alasan_tolak?: string | null
          box?: number
          catatan?: string | null
          created_at?: string
          dicatat_oleh: string
          ditinjau_oleh?: string | null
          ditinjau_pada?: string | null
          faktor_box?: number
          foto_nota_url?: string | null
          harga_per_kg: number
          id?: string
          jenis_ikan: string
          jumlah_dibayar?: number
          jumlah_kg: number
          jumlah_mati?: number
          petani_id: string
          sisa_kg?: number
          status_bayar: Database["public"]["Enums"]["status_bayar"]
          status_pengiriman?: Database["public"]["Enums"]["status_pengiriman"]
          status_transaksi?: Database["public"]["Enums"]["status_transaksi"]
          tanggal?: string
          total_harga?: number | null
        }
        Update: {
          alasan_tolak?: string | null
          box?: number
          catatan?: string | null
          created_at?: string
          dicatat_oleh?: string
          ditinjau_oleh?: string | null
          ditinjau_pada?: string | null
          faktor_box?: number
          foto_nota_url?: string | null
          harga_per_kg?: number
          id?: string
          jenis_ikan?: string
          jumlah_dibayar?: number
          jumlah_kg?: number
          jumlah_mati?: number
          petani_id?: string
          sisa_kg?: number
          status_bayar?: Database["public"]["Enums"]["status_bayar"]
          status_pengiriman?: Database["public"]["Enums"]["status_pengiriman"]
          status_transaksi?: Database["public"]["Enums"]["status_transaksi"]
          tanggal?: string
          total_harga?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pembelian_petani_id_fkey"
            columns: ["petani_id"]
            isOneToOne: false
            referencedRelation: "petani"
            referencedColumns: ["id"]
          },
        ]
      }
      pengaturan: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      penjualan: {
        Row: {
          alasan_tolak: string | null
          berat_kg: number
          catatan: string | null
          created_at: string
          dicatat_oleh: string
          ditinjau_oleh: string | null
          ditinjau_pada: string | null
          foto_nota_url: string | null
          foto_timbangan_url: string | null
          grade: string | null
          harga_per_kg: number
          id: string
          jenis_ikan: string
          jumlah_dibayar: number
          jumlah_ekor: number
          kolam: string | null
          metode: Database["public"]["Enums"]["metode_pembayaran"]
          pelanggan_id: string
          pembelian_id: string | null
          status_bayar: Database["public"]["Enums"]["status_bayar"]
          status_transaksi: Database["public"]["Enums"]["status_transaksi"]
          tanggal: string
          total_harga: number | null
          ukuran: string | null
          updated_at: string
        }
        Insert: {
          alasan_tolak?: string | null
          berat_kg: number
          catatan?: string | null
          created_at?: string
          dicatat_oleh: string
          ditinjau_oleh?: string | null
          ditinjau_pada?: string | null
          foto_nota_url?: string | null
          foto_timbangan_url?: string | null
          grade?: string | null
          harga_per_kg: number
          id?: string
          jenis_ikan: string
          jumlah_dibayar?: number
          jumlah_ekor?: number
          kolam?: string | null
          metode?: Database["public"]["Enums"]["metode_pembayaran"]
          pelanggan_id: string
          pembelian_id?: string | null
          status_bayar?: Database["public"]["Enums"]["status_bayar"]
          status_transaksi?: Database["public"]["Enums"]["status_transaksi"]
          tanggal?: string
          total_harga?: number | null
          ukuran?: string | null
          updated_at?: string
        }
        Update: {
          alasan_tolak?: string | null
          berat_kg?: number
          catatan?: string | null
          created_at?: string
          dicatat_oleh?: string
          ditinjau_oleh?: string | null
          ditinjau_pada?: string | null
          foto_nota_url?: string | null
          foto_timbangan_url?: string | null
          grade?: string | null
          harga_per_kg?: number
          id?: string
          jenis_ikan?: string
          jumlah_dibayar?: number
          jumlah_ekor?: number
          kolam?: string | null
          metode?: Database["public"]["Enums"]["metode_pembayaran"]
          pelanggan_id?: string
          pembelian_id?: string | null
          status_bayar?: Database["public"]["Enums"]["status_bayar"]
          status_transaksi?: Database["public"]["Enums"]["status_transaksi"]
          tanggal?: string
          total_harga?: number | null
          ukuran?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "penjualan_pelanggan_id_fkey"
            columns: ["pelanggan_id"]
            isOneToOne: false
            referencedRelation: "pelanggan"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "penjualan_pembelian_id_fkey"
            columns: ["pembelian_id"]
            isOneToOne: false
            referencedRelation: "pembelian"
            referencedColumns: ["id"]
          },
        ]
      }
      percakapan_ai: {
        Row: {
          created_at: string
          id: string
          judul: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          judul?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          judul?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pesan_ai: {
        Row: {
          created_at: string
          id: string
          isi: Json
          peran: string
          percakapan_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          isi: Json
          peran: string
          percakapan_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          isi?: Json
          peran?: string
          percakapan_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pesan_ai_percakapan_id_fkey"
            columns: ["percakapan_id"]
            isOneToOne: false
            referencedRelation: "percakapan_ai"
            referencedColumns: ["id"]
          },
        ]
      }
      petani: {
        Row: {
          alamat: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          nama: string
          telepon: string | null
        }
        Insert: {
          alamat?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          nama: string
          telepon?: string | null
        }
        Update: {
          alamat?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          nama?: string
          telepon?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          nama: string
        }
        Insert: {
          created_at?: string
          id: string
          nama?: string
        }
        Update: {
          created_at?: string
          id?: string
          nama?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bayar_hutang: {
        Args: { _jumlah: number; _pembelian_id: string }
        Returns: {
          alasan_tolak: string | null
          box: number
          catatan: string | null
          created_at: string
          dicatat_oleh: string
          ditinjau_oleh: string | null
          ditinjau_pada: string | null
          faktor_box: number
          foto_nota_url: string | null
          harga_per_kg: number
          id: string
          jenis_ikan: string
          jumlah_dibayar: number
          jumlah_kg: number
          jumlah_mati: number
          petani_id: string
          sisa_kg: number
          status_bayar: Database["public"]["Enums"]["status_bayar"]
          status_pengiriman: Database["public"]["Enums"]["status_pengiriman"]
          status_transaksi: Database["public"]["Enums"]["status_transaksi"]
          tanggal: string
          total_harga: number | null
        }
        SetofOptions: {
          from: "*"
          to: "pembelian"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_pembelian: {
        Args: {
          _box: number
          _catatan?: string
          _faktor_box: number
          _foto_nota_url?: string
          _harga_per_kg: number
          _jenis_ikan: string
          _jumlah_dibayar?: number
          _petani_id: string
          _sisa_kg: number
          _status_bayar: Database["public"]["Enums"]["status_bayar"]
          _status_transaksi?: Database["public"]["Enums"]["status_transaksi"]
          _tanggal?: string
        }
        Returns: {
          alasan_tolak: string | null
          box: number
          catatan: string | null
          created_at: string
          dicatat_oleh: string
          ditinjau_oleh: string | null
          ditinjau_pada: string | null
          faktor_box: number
          foto_nota_url: string | null
          harga_per_kg: number
          id: string
          jenis_ikan: string
          jumlah_dibayar: number
          jumlah_kg: number
          jumlah_mati: number
          petani_id: string
          sisa_kg: number
          status_bayar: Database["public"]["Enums"]["status_bayar"]
          status_pengiriman: Database["public"]["Enums"]["status_pengiriman"]
          status_transaksi: Database["public"]["Enums"]["status_transaksi"]
          tanggal: string
          total_harga: number | null
        }
        SetofOptions: {
          from: "*"
          to: "pembelian"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_penjualan: {
        Args: {
          _berat_kg: number
          _catatan?: string
          _foto_nota_url?: string
          _foto_timbangan_url?: string
          _grade?: string
          _harga_per_kg: number
          _jenis_ikan: string
          _jumlah_dibayar?: number
          _jumlah_ekor?: number
          _kolam?: string
          _metode?: Database["public"]["Enums"]["metode_pembayaran"]
          _pelanggan_id: string
          _status_bayar?: Database["public"]["Enums"]["status_bayar"]
          _status_transaksi?: Database["public"]["Enums"]["status_transaksi"]
          _tanggal?: string
          _ukuran?: string
        }
        Returns: {
          alasan_tolak: string | null
          berat_kg: number
          catatan: string | null
          created_at: string
          dicatat_oleh: string
          ditinjau_oleh: string | null
          ditinjau_pada: string | null
          foto_nota_url: string | null
          foto_timbangan_url: string | null
          grade: string | null
          harga_per_kg: number
          id: string
          jenis_ikan: string
          jumlah_dibayar: number
          jumlah_ekor: number
          kolam: string | null
          metode: Database["public"]["Enums"]["metode_pembayaran"]
          pelanggan_id: string
          pembelian_id: string | null
          status_bayar: Database["public"]["Enums"]["status_bayar"]
          status_transaksi: Database["public"]["Enums"]["status_transaksi"]
          tanggal: string
          total_harga: number | null
          ukuran: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "penjualan"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_penjualan_dari_pembelian: {
        Args: {
          _berat_kg: number
          _catatan?: string
          _foto_nota_url?: string
          _foto_timbangan_url?: string
          _grade?: string
          _harga_per_kg: number
          _jumlah_dibayar?: number
          _jumlah_ekor?: number
          _kolam?: string
          _pelanggan_id: string
          _pembelian_id: string
          _status_bayar?: Database["public"]["Enums"]["status_bayar"]
          _tanggal?: string
          _ukuran?: string
        }
        Returns: {
          alasan_tolak: string | null
          berat_kg: number
          catatan: string | null
          created_at: string
          dicatat_oleh: string
          ditinjau_oleh: string | null
          ditinjau_pada: string | null
          foto_nota_url: string | null
          foto_timbangan_url: string | null
          grade: string | null
          harga_per_kg: number
          id: string
          jenis_ikan: string
          jumlah_dibayar: number
          jumlah_ekor: number
          kolam: string | null
          metode: Database["public"]["Enums"]["metode_pembayaran"]
          pelanggan_id: string
          pembelian_id: string | null
          status_bayar: Database["public"]["Enums"]["status_bayar"]
          status_transaksi: Database["public"]["Enums"]["status_transaksi"]
          tanggal: string
          total_harga: number | null
          ukuran: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "penjualan"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_penjualan_gabungan: {
        Args: {
          _berat_kg: number
          _catatan?: string
          _foto_nota_url?: string
          _foto_timbangan_url?: string
          _grade?: string
          _harga_per_kg: number
          _jumlah_dibayar?: number
          _jumlah_ekor?: number
          _kolam?: string
          _pelanggan_id: string
          _status_bayar?: Database["public"]["Enums"]["status_bayar"]
          _tanggal?: string
          _ukuran?: string
        }
        Returns: {
          jumlah_baris: number
          laba: number
          total_modal: number
          total_penjualan: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      kontak_pelanggan: {
        Args: never
        Returns: {
          alamat: string
          id: string
          telepon: string
        }[]
      }
      kontak_petani: {
        Args: never
        Returns: {
          alamat: string
          id: string
          telepon: string
        }[]
      }
      pembelian_tersedia: {
        Args: { _hanya_sisa?: boolean }
        Returns: {
          box: number
          faktor_box: number
          harga_per_kg: number
          id: string
          jenis_ikan: string
          jumlah_kg: number
          kg_sisa: number
          kg_terjual: number
          nama_petani: string
          petani_id: string
          sisa_kg: number
          status_jual: string
          tanggal: string
          total_harga: number
        }[]
      }
      profit_per_customer: {
        Args: { _dari?: string; _sampai?: string }
        Returns: {
          nama: string
          omzet: number
          piutang: number
          total_kg: number
          transaksi: number
        }[]
      }
      profit_per_ikan: {
        Args: { _dari?: string; _sampai?: string }
        Returns: {
          jenis_ikan: string
          kg_beli: number
          kg_jual: number
          laba_kotor: number
          margin: number
          modal: number
          penjualan: number
        }[]
      }
      profit_per_lot: {
        Args: { _dari?: string; _sampai?: string }
        Returns: {
          biaya: number
          kg_beli: number
          kg_jual: number
          laba_bersih: number
          lot: string
          margin: number
          modal: number
          penjualan: number
        }[]
      }
      profit_per_supplier: {
        Args: { _dari?: string; _sampai?: string }
        Returns: {
          hutang: number
          modal: number
          nama: string
          total_kg: number
          transaksi: number
        }[]
      }
      profit_series: {
        Args: { _dari?: string; _grup?: string; _sampai?: string }
        Returns: {
          biaya: number
          laba_bersih: number
          laba_kotor: number
          margin: number
          modal: number
          penjualan: number
          periode: string
        }[]
      }
      ringkasan_dashboard: {
        Args: never
        Returns: {
          beli_hari_ini: number
          hutang: number
          jml_belum_lunas: number
          jml_menunggu: number
          jual_hari_ini: number
          laba_hari_ini: number
          piutang: number
          saldo_kas: number
        }[]
      }
      ringkasan_hari_ini: {
        Args: { _tanggal?: string }
        Returns: {
          berat_dibeli: number
          berat_terjual: number
          laba_bersih: number
          nilai_modal: number
          nilai_persediaan: number
          total_operasional: number
          total_pembelian: number
          total_penjualan: number
        }[]
      }
      ringkasan_periode: {
        Args: { _dari?: string; _sampai?: string }
        Returns: {
          hutang: number
          jml_belum_lunas: number
          laba_bersih: number
          laba_hari_ini: number
          laba_kotor: number
          margin: number
          modal_hari_ini: number
          omzet_hari_ini: number
          piutang: number
          saldo_kas: number
          total_biaya: number
          total_modal: number
          total_penjualan: number
        }[]
      }
      stok_gabungan: {
        Args: never
        Returns: {
          harga_beli_rata: number
          jenis_ikan: string
          jumlah_lot: number
          kg_sisa: number
          nilai_modal: number
        }[]
      }
      stok_ikan: {
        Args: never
        Returns: {
          harga_rata: number
          jenis_ikan: string
          kg_keluar: number
          kg_masuk: number
          kg_sisa: number
          nilai_persediaan: number
        }[]
      }
    }
    Enums: {
      app_role: "mandor" | "owner"
      metode_pembayaran: "tunai"
      status_bayar: "lunas" | "belum" | "sebagian"
      status_pengiriman: "dikirim" | "ditampung_kolam"
      status_transaksi: "draft" | "menunggu" | "disetujui" | "ditolak"
      tipe_kas: "masuk" | "keluar"
      tipe_pembayaran: "bayar_petani" | "terima_pembeli"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["mandor", "owner"],
      metode_pembayaran: ["tunai"],
      status_bayar: ["lunas", "belum", "sebagian"],
      status_pengiriman: ["dikirim", "ditampung_kolam"],
      status_transaksi: ["draft", "menunggu", "disetujui", "ditolak"],
      tipe_kas: ["masuk", "keluar"],
      tipe_pembayaran: ["bayar_petani", "terima_pembeli"],
    },
  },
} as const
