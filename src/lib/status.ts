export type StatusTransaksi = "draft" | "menunggu" | "disetujui" | "ditolak";
export type StatusBayar = "lunas" | "belum" | "sebagian";

export const LABEL_TRANSAKSI: Record<StatusTransaksi, string> = {
  draft: "Draft",
  menunggu: "Menunggu",
  disetujui: "Disetujui",
  ditolak: "Ditolak",
};

export const KELAS_TRANSAKSI: Record<StatusTransaksi, string> = {
  draft: "bg-muted text-muted-foreground",
  menunggu: "bg-warning/15 text-warning",
  disetujui: "bg-success/15 text-success",
  ditolak: "bg-destructive/15 text-destructive",
};

export const LABEL_BAYAR: Record<StatusBayar, string> = {
  lunas: "Lunas",
  belum: "Belum bayar",
  sebagian: "Sebagian",
};

export const KELAS_BAYAR: Record<StatusBayar, string> = {
  lunas: "bg-success/15 text-success",
  belum: "bg-destructive/15 text-destructive",
  sebagian: "bg-warning/15 text-warning",
};
