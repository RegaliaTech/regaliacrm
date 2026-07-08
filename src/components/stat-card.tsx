import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

type Accent = "indigo" | "emerald" | "amber" | "rose" | "sky";

const accents: Record<Accent, { chip: string; glow: string }> = {
  indigo: {
    chip: "bg-gradient-to-br from-indigo-500 to-violet-600 text-white",
    glow: "shadow-indigo-500/30",
  },
  emerald: {
    chip: "bg-gradient-to-br from-emerald-500 to-teal-600 text-white",
    glow: "shadow-emerald-500/30",
  },
  amber: {
    chip: "bg-gradient-to-br from-amber-400 to-orange-500 text-white",
    glow: "shadow-amber-500/30",
  },
  rose: {
    chip: "bg-gradient-to-br from-rose-500 to-pink-600 text-white",
    glow: "shadow-rose-500/30",
  },
  sky: {
    chip: "bg-gradient-to-br from-sky-500 to-blue-600 text-white",
    glow: "shadow-sky-500/30",
  },
};

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = "indigo",
  delta,
  hint,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  accent?: Accent;
  delta?: number;
  hint?: string;
}) {
  const a = accents[accent];
  const positive = (delta ?? 0) >= 0;

  return (
    <div className="group relative overflow-hidden rounded-3xl bg-white/60 p-5 shadow-lg shadow-black/5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:bg-white/80 hover:shadow-xl hover:shadow-black/10">
      {/* Glassmorphic overlay */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/40 to-white/10" />
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-transparent via-white/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      
      <div className="relative flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className="text-3xl font-semibold tracking-tight tabular-nums text-slate-900">
            {value}
          </p>
        </div>
        <div
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl",
            a.chip,
            a.glow,
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
      {(delta !== undefined || hint) && (
        <div className="relative mt-3 flex items-center gap-2 text-xs">
          {delta !== undefined && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-2 py-1 font-semibold backdrop-blur-sm",
                positive
                  ? "bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20"
                  : "bg-rose-500/10 text-rose-600 ring-1 ring-rose-500/20",
              )}
            >
              {positive ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {Math.abs(delta)}%
            </span>
          )}
          {hint && <span className="text-gray-500">{hint}</span>}
        </div>
      )}
    </div>
  );
}
