import { useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Fish } from "lucide-react";

const CONTOH = [
  "Berapa laba saya hari ini?",
  "Siapa saja yang masih punya piutang?",
  "Ringkas transaksi minggu ini",
];

export function ChatAI({
  percakapanId,
  pesanAwal,
}: {
  percakapanId: string;
  pesanAwal: UIMessage[];
}) {
  const qc = useQueryClient();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const { messages, sendMessage, status } = useChat({
    id: percakapanId,
    messages: pesanAwal,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { percakapanId },
      headers: async (): Promise<Record<string, string>> => {
        const { data } = await supabase.auth.getSession();
        return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
      },
    }),
    onError: (error) => toast.error(error.message || "Gagal menghubungi AI"),
    onFinish: () => {
      qc.invalidateQueries({ queryKey: ["percakapan-ai"] });
      textareaRef.current?.focus();
    },
  });

  useEffect(() => {
    textareaRef.current?.focus();
  }, [percakapanId]);

  const sibuk = status === "submitted" || status === "streaming";

  const kirim = (teks: string) => {
    const t = teks.trim();
    if (!t || sibuk) return;
    void sendMessage({ text: t });
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  return (
    <div className="flex h-[calc(100dvh-56px)] flex-col">
      <Conversation className="flex-1">
        <ConversationContent className="mx-auto w-full max-w-[760px]">
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={<Fish className="h-6 w-6 text-primary" />}
              title="Tanya AI Bandar Ikan"
              description="Tanyakan apa saja tentang pembelian, penjualan, kas, hutang, dan piutang Anda."
            >
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {CONTOH.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => kirim(c)}
                    className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent"
                  >
                    {c}
                  </button>
                ))}
              </div>
            </ConversationEmptyState>
          ) : (
            messages.map((m) => (
              <Message key={m.id} from={m.role}>
                <MessageContent>
                  {m.parts.map((part, i) =>
                    part.type === "text" ? (
                      <MessageResponse key={i}>{part.text}</MessageResponse>
                    ) : null,
                  )}
                </MessageContent>
              </Message>
            ))
          )}
          {status === "submitted" && (
            <Message from="assistant">
              <MessageContent>
                <Shimmer>Sedang berpikir…</Shimmer>
              </MessageContent>
            </Message>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t border-border bg-background p-3">
        <div className="mx-auto w-full max-w-[760px]">
          <PromptInput
            onSubmit={(_msg, event) => {
              event.preventDefault();
              const form = event.currentTarget as HTMLFormElement;
              const ta = form.querySelector("textarea");
              const value = ta?.value ?? "";
              if (ta) ta.value = "";
              kirim(value);
            }}
          >
            <PromptInputTextarea ref={textareaRef} placeholder="Tanya tentang data bandar ikan Anda…" />
            <PromptInputFooter className="justify-end">
              <PromptInputSubmit status={status} disabled={sibuk} />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}
