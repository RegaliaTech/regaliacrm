"use client";

import { useEffect, useRef, useState, useTransition, type RefObject } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { SendHorizontal, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  sendAssistantMessage,
  confirmAssistantAction,
  type AssistantResult,
  type ConfirmResult,
} from "@/app/(app)/assistant/actions";
import type { ChatMessage } from "@/lib/ai";
import type { PendingAction } from "@/lib/ai/agent";

type UiMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
  error?: boolean;
  /** A mutating action the assistant proposed, awaiting the user's confirmation. */
  pendingAction?: PendingAction;
  /** Set once the user acts on `pendingAction`, so the buttons stop rendering. */
  actionResolved?: "confirmed" | "cancelled";
};

const SUGGESTIONS = [
  "Draft a friendly follow-up email",
  "How should I re-engage a cold lead?",
  "Explain what quotations and follow-ups do",
];

/** Where the popover anchors, computed from the trigger button's live rect. */
type Anchor = { left: number; bottom: number; maxHeight: number };
const DEFAULT_ANCHOR: Anchor = { left: 88, bottom: 88, maxHeight: 600 };

export function AssistantPanel({
  open,
  onClose,
  anchorRef,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef?: RefObject<HTMLButtonElement | null>;
}) {
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [anchor, setAnchor] = useState<Anchor>(DEFAULT_ANCHOR);
  const idRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => setMounted(true), []);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Anchor the popover next to the trigger icon; recompute on resize.
  useEffect(() => {
    if (!open) return;
    const compute = () => {
      const el = anchorRef?.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setAnchor({
        left: Math.round(rect.right + 12),
        bottom: Math.round(window.innerHeight - rect.bottom),
        maxHeight: Math.round(Math.min(600, rect.bottom - 16)),
      });
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [open, anchorRef]);

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
              pendingAction: result.pendingAction,
            },
      ]);
    });
  };

  const confirmPending = (msg: UiMessage) => {
    const action = msg.pendingAction;
    if (!action || isPending) return;

    setMessages((prev) =>
      prev.map((m) =>
        m.id === msg.id ? { ...m, actionResolved: "confirmed" as const } : m,
      ),
    );

    startTransition(async () => {
      let result: ConfirmResult;
      try {
        result = await confirmAssistantAction(action.name, action.args);
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
          : { id: ++idRef.current, role: "assistant", content: result.reply },
      ]);
    });
  };

  const cancelPending = (msg: UiMessage) => {
    setMessages((prev) => [
      ...prev.map((m) =>
        m.id === msg.id ? { ...m, actionResolved: "cancelled" as const } : m,
      ),
      {
        id: ++idRef.current,
        role: "assistant" as const,
        content: "Okay, cancelled.",
      },
    ]);
  };

  if (!mounted) return null;

  return createPortal(
    <div
      className={cn("fixed inset-0 z-[70]", open ? "" : "pointer-events-none")}
      aria-hidden={!open}
    >
      {/* Transparent click-outside layer — closes the popover, no modal scrim. */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Floating window, anchored beside the dock's AI icon */}
      <div
        role="dialog"
        aria-label="AI Assistant"
        style={{
          left: anchor.left,
          bottom: anchor.bottom,
          maxHeight: anchor.maxHeight,
        }}
        className={cn(
          "glass-strong fixed flex h-[min(80vh,600px)] w-[min(92vw,400px)] origin-bottom-left flex-col rounded-3xl border border-[var(--border)] shadow-[var(--shadow-lg)] transition-all duration-200 ease-out",
          open
            ? "scale-100 opacity-100"
            : "pointer-events-none scale-95 opacity-0",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-[var(--glow-primary)]">
              <Image
                src="/ai-assistant-icon.png"
                alt=""
                width={36}
                height={36}
                className="h-full w-full object-contain p-1.5 [filter:brightness(0)_invert(1)]"
              />
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
              <div className="ai-alive-icon relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-[var(--glow-primary)]">
                <Image
                  src="/ai-assistant-icon.png"
                  alt=""
                  width={56}
                  height={56}
                  className="h-full w-full object-contain p-2 [filter:brightness(0)_invert(1)]"
                />
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
              <div key={m.id} className="space-y-2">
                <div
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

                {/* Confirmation card for a proposed write action */}
                {m.pendingAction && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-2xl border border-indigo-200 bg-indigo-50/70 px-3.5 py-3 text-sm">
                      <p className="font-medium text-slate-800">
                        {m.pendingAction.summary}
                      </p>
                      {m.actionResolved ? (
                        <p className="mt-2 text-xs font-medium text-[var(--muted)]">
                          {m.actionResolved === "confirmed"
                            ? "Confirmed"
                            : "Cancelled"}
                        </p>
                      ) : (
                        <div className="mt-2.5 flex gap-2">
                          <button
                            onClick={() => confirmPending(m)}
                            disabled={isPending}
                            className="ios-press flex-1 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-[var(--glow-primary)] disabled:opacity-40"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => cancelPending(m)}
                            disabled={isPending}
                            className="ios-press flex-1 rounded-xl border border-[var(--border)] bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-white disabled:opacity-40"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
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
