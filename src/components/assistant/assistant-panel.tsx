"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Sparkles, SendHorizontal, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  sendAssistantMessage,
  type AssistantResult,
} from "@/app/(app)/assistant/actions";
import type { ChatMessage } from "@/lib/ai";

type UiMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
  error?: boolean;
};

const SUGGESTIONS = [
  "Draft a friendly follow-up email",
  "How should I re-engage a cold lead?",
  "Explain what quotations and follow-ups do",
];

export function AssistantPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const idRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Focus the input and scroll to the newest message when opened/updated.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isPending]);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isPending) return;

    const userMsg: UiMessage = {
      id: ++idRef.current,
      role: "user",
      content: trimmed,
    };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");

    const history: ChatMessage[] = next
      .filter((m) => !m.error)
      .map((m) => ({ role: m.role, content: m.content }));

    startTransition(async () => {
      let result: AssistantResult;
      try {
        result = await sendAssistantMessage(history);
      } catch {
        result = { error: "Something went wrong. Please try again." };
      }
      setMessages((prev) => [
        ...prev,
        "error" in result
          ? {
              id: ++idRef.current,
              role: "assistant",
              content: result.error,
              error: true,
            }
          : {
              id: ++idRef.current,
              role: "assistant",
              content: result.reply,
            },
      ]);
    });
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[70] transition-opacity duration-200",
        open ? "opacity-100" : "pointer-events-none opacity-0",
      )}
      aria-hidden={!open}
    >
      {/* Scrim */}
      <div
        className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-label="AI Assistant"
        className={cn(
          "glass-strong absolute right-0 top-0 flex h-full w-[min(92vw,26rem)] flex-col border-l border-[var(--border)] shadow-[var(--shadow-lg)] transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-[var(--glow-primary)]">
              <Sparkles className="h-[18px] w-[18px]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">AI Assistant</p>
              <p className="text-xs text-[var(--muted)]">Here to help</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="ios-press rounded-xl p-1.5 text-slate-400 hover:bg-white/60 hover:text-slate-700"
            aria-label="Close assistant"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-[var(--glow-primary)]">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">
                  How can I help?
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Draft emails, brainstorm outreach, or ask how the app works.
                </p>
              </div>
              <div className="flex w-full flex-col gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="ios-press rounded-2xl border border-[var(--border)] bg-white/60 px-3 py-2 text-left text-sm text-slate-700 hover:bg-white/90"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "flex",
                  m.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm",
                    m.role === "user"
                      ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white"
                      : m.error
                        ? "border border-red-200 bg-red-50 text-red-700"
                        : "border border-[var(--border)] bg-white/80 text-slate-800",
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))
          )}

          {isPending && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-white/80 px-3.5 py-2.5 text-sm text-[var(--muted)]">
                <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
              </div>
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-[var(--border)] p-3">
          <div className="flex items-end gap-2 rounded-2xl border border-[var(--border)] bg-white/70 p-1.5 focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-500/10">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={1}
              placeholder="Ask anything…"
              className="max-h-32 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || isPending}
              className="ios-press flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-[var(--glow-primary)] disabled:opacity-40"
              aria-label="Send message"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <SendHorizontal className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
