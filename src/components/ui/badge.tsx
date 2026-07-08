import * as React from "react";
import { cn } from "@/lib/utils";

type Tone =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "muted";

const tones: Record<Tone, string> = {
  default: "bg-slate-500/10 text-slate-700 ring-1 ring-slate-500/20 backdrop-blur-sm",
  primary: "bg-indigo-500/10 text-indigo-700 ring-1 ring-indigo-500/20 backdrop-blur-sm",
  success: "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20 backdrop-blur-sm",
  warning: "bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/20 backdrop-blur-sm",
  danger: "bg-rose-500/10 text-rose-700 ring-1 ring-rose-500/20 backdrop-blur-sm",
  muted: "bg-gray-500/10 text-gray-500 ring-1 ring-gray-500/20 backdrop-blur-sm",
};

export function Badge({
  className,
  tone = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
