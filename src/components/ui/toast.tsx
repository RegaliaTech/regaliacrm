"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastTone = "success" | "error" | "info";

type Toast = {
  id: number;
  tone: ToastTone;
  message: string;
};

type ToastContextValue = {
  toast: (message: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 4000;

const toneStyles: Record<
  ToastTone,
  { icon: React.ComponentType<{ className?: string }>; accent: string }
> = {
  success: { icon: CheckCircle2, accent: "text-emerald-600" },
  error: { icon: XCircle, accent: "text-red-600" },
  info: { icon: Info, accent: "text-indigo-600" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, tone: ToastTone = "info") => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, tone, message }]);
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {typeof document !== "undefined" &&
        toasts.length > 0 &&
        createPortal(
          <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(92vw,22rem)] flex-col gap-2">
            {toasts.map((t) => {
              const { icon: Icon, accent } = toneStyles[t.tone];
              return (
                <div
                  key={t.id}
                  role="status"
                  className="glass-strong animate-in pointer-events-auto flex items-start gap-3 rounded-2xl px-4 py-3 shadow-[var(--shadow-lg)]"
                >
                  <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", accent)} />
                  <p className="flex-1 text-sm text-slate-900">{t.message}</p>
                  <button
                    type="button"
                    onClick={() => dismiss(t.id)}
                    className="ios-press -m-1 rounded-lg p-1 text-slate-400 hover:text-slate-700"
                    aria-label="Dismiss"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a <ToastProvider>");
  }
  return ctx;
}
