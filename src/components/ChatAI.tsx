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
              icon={
                <span className="surface-card grid h-12 w-12 place-items-center rounded-2xl">
                  <Fish className="h-6 w-6 text-primary" />
                </span>
              }
              title="Tanya AI Bandar Ikan"
              description="Tanyakan apa saja tentang pembelian, penjualan, kas, hutang, dan piutang Anda."
            >
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {CONTOH.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => kirim(c)}
                    className="surface-card rounded-full px-3.5 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {c}
                  </button>
                ))}
              </div>
            </ConversationEmptyState>
          ) : (
            messages.map((m) => (
              <Message key={m.id} from={m.role} className="!flex-row items-start gap-2.5">
                {m.role === "assistant" && (
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/12 text-primary ring-1 ring-primary/15">
                    <Fish className="h-3.5 w-3.5" />
                  </span>
                )}
                <MessageContent className="group-[.is-user]:rounded-2xl group-[.is-user]:rounded-br-md group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground group-[.is-user]:shadow-sm group-[.is-assistant]:leading-relaxed">
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
            <Message from="assistant" className="!flex-row items-start gap-2.5">
              <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/12 text-primary ring-1 ring-primary/15">
                <Fish className="h-3.5 w-3.5" />
              </span>
              <MessageContent>
                <Shimmer>Sedang berpikir…</Shimmer>
              </MessageContent>
            </Message>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t border-border/60 bg-background/70 p-3 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-[760px]">
          <PromptInput
            className="surface-card rounded-2xl"
            onSubmit={(_msg, event) => {
              event.preventDefault();
              const form = event.currentTarget as HTMLFormElement;
              const ta = form.querySelector("textarea");
              const value = ta?.value ?? "";
              if (ta) ta.value = "";
              kirim(value);
            }}
          >
            <PromptInputTextarea
              ref={textareaRef}
              className="bg-transparent"
              placeholder="Tanya tentang data bandar ikan Anda…"
            />
            <PromptInputFooter className="justify-end">
              <PromptInputSubmit status={status} disabled={sibuk} />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}
