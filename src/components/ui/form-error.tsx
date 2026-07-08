import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Inline form error banner. Replaces the literal
 * `rounded-xl border border-red-200 bg-red-50 …` block that was copy-pasted
 * into every form. Renders nothing when there is no error.
 */
export function FormError({ error }: { error?: string | null }) {
  if (!error) return null;
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {error}
    </div>
  );
}

type Tone = "success" | "error" | "info";

const toneClasses: Record<Tone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  error: "border-red-200 bg-red-50 text-red-800",
  info: "border-indigo-200 bg-indigo-50 text-indigo-800",
};

/**
 * General-purpose inline notice banner (success / error / info). Standardizes
 * the one-off emerald/red banners previously hand-built on the follow-ups page.
 */
export function FormNotice({
  tone = "info",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </div>
  );
}
