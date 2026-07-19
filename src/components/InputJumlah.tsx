import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Minus, Plus } from "lucide-react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  step?: number;
  min?: number;
  id?: string;
  placeholder?: string;
}

export function InputJumlah({ value, onChange, step = 1, min = 0, id, placeholder }: Props) {
  const num = parseFloat(value || "0") || 0;
  const dec = (v: number) => onChange(String(Math.max(min, +(v - step).toFixed(2))));
  const inc = (v: number) => onChange(String(+(v + step).toFixed(2)));

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-12 w-11 shrink-0"
        onClick={() => dec(num)}
        aria-label="Kurangi"
      >
        <Minus className="h-4 w-4" />
      </Button>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        step={step}
        min={min}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 text-center text-base"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-12 w-11 shrink-0"
        onClick={() => inc(num)}
        aria-label="Tambah"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
