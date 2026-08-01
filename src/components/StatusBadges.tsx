import { Badge } from "@/components/ui/badge";
import {
  KELAS_BAYAR,
  KELAS_TRANSAKSI,
  LABEL_BAYAR,
  LABEL_TRANSAKSI,
  type StatusBayar,
  type StatusTransaksi,
} from "@/lib/status";

export function BadgeTransaksi({ status }: { status: StatusTransaksi }) {
  return (
    <Badge variant="secondary" className={KELAS_TRANSAKSI[status]}>
      {LABEL_TRANSAKSI[status]}
    </Badge>
  );
}

export function BadgeBayar({ status }: { status: StatusBayar }) {
  return (
    <Badge variant="secondary" className={KELAS_BAYAR[status]}>
      {LABEL_BAYAR[status]}
    </Badge>
  );
}
