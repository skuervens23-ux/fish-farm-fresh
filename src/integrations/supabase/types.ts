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
          created_at: string
          dicatat_oleh: string
          harga_per_kg: number
          id: string
          jenis_ikan: string
          jumlah_dibayar: number
          jumlah_kg: number
          jumlah_mati: number
          petani_id: string
          status_bayar: Database["public"]["Enums"]["status_bayar"]
          status_pengiriman: Database["public"]["Enums"]["status_pengiriman"]
          tanggal: string
          total_harga: number
        }
        Insert: {
          created_at?: string
          dicatat_oleh: string
          harga_per_kg: number
          id?: string
          jenis_ikan: string
          jumlah_dibayar?: number
          jumlah_kg: number
          jumlah_mati?: number
          petani_id: string
          status_bayar: Database["public"]["Enums"]["status_bayar"]
          status_pengiriman?: Database["public"]["Enums"]["status_pengiriman"]
          tanggal?: string
          total_harga?: number
        }
        Update: {
          created_at?: string
          dicatat_oleh?: string
          harga_per_kg?: number
          id?: string
          jenis_ikan?: string
          jumlah_dibayar?: number
          jumlah_kg?: number
          jumlah_mati?: number
          petani_id?: string
          status_bayar?: Database["public"]["Enums"]["status_bayar"]
          status_pengiriman?: Database["public"]["Enums"]["status_pengiriman"]
          tanggal?: string
          total_harga?: number
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
          created_at: string
          dicatat_oleh: string
          harga_per_kg: number
          id: string
          jenis_ikan: string
          jumlah_dibayar: number
          jumlah_kg: number
          jumlah_mati: number
          petani_id: string
          status_bayar: Database["public"]["Enums"]["status_bayar"]
          status_pengiriman: Database["public"]["Enums"]["status_pengiriman"]
          tanggal: string
          total_harga: number
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
          _harga_per_kg: number
          _jenis_ikan: string
          _jumlah_dibayar: number
          _jumlah_kg: number
          _petani_id: string
          _status_bayar: Database["public"]["Enums"]["status_bayar"]
        }
        Returns: {
          created_at: string
          dicatat_oleh: string
          harga_per_kg: number
          id: string
          jenis_ikan: string
          jumlah_dibayar: number
          jumlah_kg: number
          jumlah_mati: number
          petani_id: string
          status_bayar: Database["public"]["Enums"]["status_bayar"]
          status_pengiriman: Database["public"]["Enums"]["status_pengiriman"]
          tanggal: string
          total_harga: number
        }
        SetofOptions: {
          from: "*"
          to: "pembelian"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "mandor" | "owner"
      metode_pembayaran: "tunai"
      status_bayar: "lunas" | "belum" | "sebagian"
      status_pengiriman: "dikirim" | "ditampung_kolam"
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
      tipe_pembayaran: ["bayar_petani", "terima_pembeli"],
    },
  },
} as const
