import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 hover:from-indigo-500 hover:to-violet-500",
  secondary: "bg-white/60 text-slate-900 backdrop-blur-xl shadow-lg shadow-black/5 hover:bg-white/80 hover:shadow-xl",
  outline:
    "border border-gray-200/50 bg-white/40 text-slate-900 backdrop-blur-xl shadow-sm hover:bg-white/60 hover:shadow-md",
  ghost: "text-slate-600 hover:bg-white/60 hover:text-slate-900 hover:backdrop-blur-xl",
  danger: "bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-lg shadow-rose-500/30 hover:shadow-xl hover:from-rose-400 hover:to-rose-500",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-6 text-base",
  icon: "h-10 w-10",
};

export function buttonClasses(
  variant: Variant = "primary",
  size: Size = "md",
  className?: string,
): string {
  return cn(
    "ios-press inline-flex items-center justify-center gap-2 rounded-2xl font-medium focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--ring)] disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={buttonClasses(variant, size, className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
