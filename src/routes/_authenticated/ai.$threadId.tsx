import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Plus, List } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChatAI } from "@/components/ChatAI";
import { usePesan, buatPercakapan } from "@/lib/ai-chat";

export const Route = createFileRoute("/_authenticated/ai/$threadId")({
  head: () => ({
    meta: [
      { title: "Percakapan AI | Bandar Ikan" },
      {
        name: "description",
        content:
          "Percakapan dengan asisten AI bandar ikan tentang transaksi, kas, hutang, dan piutang.",
      },
      { property: "og:title", content: "Percakapan AI Bandar Ikan" },
      { property: "og:description", content: "Obrolan dengan asisten AI bandar ikan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HalamanChat,
});

function HalamanChat() {
  const { threadId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: pesan, isLoading } = usePesan(threadId);

  return (
    <AppShell
      title="Tanya AI"
      actions={
        <>
          <Button variant="ghost" size="icon" aria-label="Daftar percakapan" asChild>
            <Link to="/ai">
              <List className="h-5 w-5" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Percakapan baru"
            onClick={async () => {
              const id = await buatPercakapan();
              qc.invalidateQueries({ queryKey: ["percakapan-ai"] });
              void navigate({ to: "/ai/$threadId", params: { threadId: id } });
            }}
          >
            <Plus className="h-5 w-5" />
          </Button>
        </>
      }
    >
      {isLoading ? (
        <div className="mx-auto w-full max-w-[760px] space-y-3 p-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <ChatAI key={threadId} percakapanId={threadId} pesanAwal={pesan ?? []} />
      )}
    </AppShell>
  );
}
