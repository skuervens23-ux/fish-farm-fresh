import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Camera, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function FotoPreview({ path, alt }: { path: string; alt: string }) {
  const { data: url } = useQuery({
    queryKey: ["foto-url", path],
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("nota").createSignedUrl(path, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
    staleTime: 30 * 60 * 1000,
  });
  if (!url) return <div className="h-24 w-24 animate-pulse rounded-md bg-muted" />;
  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      className="h-24 w-24 rounded-md border border-border object-cover"
    />
  );
}

export function UploadFoto({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (path: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    if (file.size > 8 * 1024 * 1024) return toast.error("Ukuran foto maksimal 8 MB");
    setUploading(true);
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      setUploading(false);
      return toast.error("Sesi berakhir, silakan masuk lagi.");
    }
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${user.user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("nota").upload(path, file, { upsert: false });
    setUploading(false);
    if (error) return toast.error(error.message);
    onChange(path);
    toast.success("Foto terunggah");
  }

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="flex items-center gap-3">
        {value ? (
          <>
            <FotoPreview path={value} alt={label} />
            <Button type="button" variant="outline" size="sm" onClick={() => onChange(null)}>
              <Trash2 className="mr-1 h-4 w-4" /> Hapus
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="h-12 w-full"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Camera className="mr-2 h-4 w-4" />
            )}
            {uploading ? "Mengunggah…" : "Ambil / pilih foto"}
          </Button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
