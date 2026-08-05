import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

/**
 * Pembungkus "lihat detail" agar angka lanjutan tidak memenuhi layar,
 * tapi tetap tersedia lengkap saat dibuka.
 */
export function RincianAngka({
  judul,
  deskripsi,
  defaultTerbuka = false,
  children,
}: {
  judul: string;
  deskripsi?: string;
  defaultTerbuka?: boolean;
  children: ReactNode;
}) {
  const [buka, setBuka] = useState(defaultTerbuka);

  return (
    <Collapsible open={buka} onOpenChange={setBuka}>
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/40 px-3.5 py-2.5 text-left transition-colors hover:bg-muted/40">
        <span>
          <span className="block text-sm font-medium text-foreground">{judul}</span>
          {deskripsi && (
            <span className="block text-[11px] text-muted-foreground">{deskripsi}</span>
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${buka ? "rotate-180" : ""}`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2.5">{children}</CollapsibleContent>
    </Collapsible>
  );
}
