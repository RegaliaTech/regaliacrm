import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-11 w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3.5 text-sm shadow-[var(--shadow-sm)] outline-none backdrop-blur-xl transition-all placeholder:text-gray-400 hover:bg-white/80 focus:border-indigo-300 focus:bg-white focus:shadow-[var(--shadow-md)] focus:ring-4 focus:ring-indigo-500/10 disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";
