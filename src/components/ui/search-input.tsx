import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * GET-form search box driven by the app's `?q=` URL convention. Unifies the two
 * variants that had drifted apart across list pages. Pass `hidden` to preserve
 * other query params (e.g. the active tab) on submit.
 */
export function SearchInput({
  action,
  name = "q",
  defaultValue,
  placeholder = "Search…",
  hidden,
  className,
  inputClassName,
}: {
  action: string;
  name?: string;
  defaultValue?: string;
  placeholder?: string;
  hidden?: Record<string, string>;
  className?: string;
  inputClassName?: string;
}) {
  return (
    <form className={cn("relative", className)} action={action} method="get">
      {hidden &&
        Object.entries(hidden).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        name={name}
        type="search"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={cn(
          "h-10 w-64 rounded-2xl border border-[var(--border)] bg-[var(--card)] pl-9 pr-3 text-sm shadow-[var(--shadow-sm)] outline-none backdrop-blur-xl transition-all placeholder:text-slate-400 hover:bg-white/80 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10",
          inputClassName,
        )}
      />
    </form>
  );
}
