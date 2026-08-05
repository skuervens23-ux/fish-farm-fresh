import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Plus, MessageSquare, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePercakapan, buatPercakapan, hapusPercakapan } from "@/lib/ai-chat";

export const Route = createFileRoute("/_authenticated/ai/")({
  head: () => ({
    meta: [
      { title: "Tanya AI | Bandar Ikan" },
      {
        name: "description",
        content:
          "Asisten AI bandar ikan: tanya laba harian, hutang petani, piutang pelanggan, dan ringkasan transaksi.",
      },
      { property: "og:title", content: "Tanya AI Bandar Ikan" },
      {
        property: "og:description",
        content: "Asisten AI untuk data pembelian, penjualan, dan kas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DaftarAI,
});

function DaftarAI() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: list = [], isLoading } = usePercakapan();

  useEffect(() => {
    if (!isLoading && list.length === 0) {
      void buatPercakapan().then((id) => {
        qc.invalidateQueries({ queryKey: ["percakapan-ai"] });
        void navigate({ to: "/ai/$threadId", params: { threadId: id } });
      });
    }
  }, [isLoading, list.length, navigate, qc]);

  const baru = async () => {
    const id = await buatPercakapan();
    qc.invalidateQueries({ queryKey: ["percakapan-ai"] });
    void navigate({ to: "/ai/$threadId", params: { threadId: id } });
  };

  return (
    <AppShell title="Tanya AI">
      <div className="mx-auto w-full max-w-[760px] space-y-3 px-4 py-4">
        <Button onClick={baru} className="h-11 w-full rounded-xl">
          <Plus className="mr-2 h-4 w-4" /> Percakapan Baru
        </Button>
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <ul className="space-y-2">
            {list.map((p) => (
              <li key={p.id}>
                <Card className="surface-card flex items-center gap-2 rounded-xl p-3 transition-colors hover:bg-accent/40">
                  <Link
                    to="/ai/$threadId"
                    params={{ threadId: p.id }}
                    className="flex min-w-0 flex-1 items-center gap-3"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/12 text-primary">
                      <MessageSquare className="h-4 w-4" />
                    </span>
                    <span className="truncate text-sm text-foreground">{p.judul}</span>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Hapus percakapan"
                    onClick={async () => {
                      await hapusPercakapan(p.id);
                      qc.invalidateQueries({ queryKey: ["percakapan-ai"] });
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
