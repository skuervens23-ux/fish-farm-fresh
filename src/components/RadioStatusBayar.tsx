import { cn } from "@/lib/utils";

export type StatusBayar = "lunas" | "belum" | "sebagian";

const OPTIONS: { value: StatusBayar; label: string; desc: string }[] = [
  { value: "lunas", label: "Lunas Tunai", desc: "Bayar penuh sekarang" },
  { value: "belum", label: "Belum Bayar", desc: "Tercatat sebagai hutang penuh" },
  { value: "sebagian", label: "Bayar Sebagian", desc: "Sisa jadi hutang" },
];

export function RadioStatusBayar({
  value,
  onChange,
}: {
  value: StatusBayar;
  onChange: (v: StatusBayar) => void;
}) {
  return (
    <div className="space-y-2">
      {OPTIONS.map((o) => {
        const active = value === o.value;
        return (
          <button
            type="button"
            key={o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex w-full items-start gap-3 rounded-lg border-2 bg-card p-3 text-left transition-colors",
              active ? "border-primary" : "border-border hover:bg-accent",
            )}
            aria-pressed={active}
          >
            <span
              className={cn(
                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                active ? "border-primary" : "border-muted-foreground",
              )}
            >
              {active && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
            </span>
            <span className="flex flex-col">
              <span className="text-sm font-medium text-foreground">{o.label}</span>
              <span className="text-xs text-muted-foreground">{o.desc}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
