import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  value: number | string,
  currency = "AED",
): string {
  const num = typeof value === "string" ? Number(value) : value;
  try {
    return new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency,
    }).format(Number.isFinite(num) ? num : 0);
  } catch {
    return `${currency} ${(Number.isFinite(num) ? num : 0).toFixed(2)}`;
  }
}

/** Compact currency for large figures, e.g. "AED 1.28M". */
export function formatCurrencyCompact(
  value: number | string,
  currency = "AED",
): string {
  const num = typeof value === "string" ? Number(value) : value;
  const safe = Number.isFinite(num) ? num : 0;
  try {
    return new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(safe);
  } catch {
    return `${currency} ${safe.toLocaleString()}`;
  }
}

export function formatDate(
  value: Date | string | null | undefined,
  opts: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", opts).format(date);
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
