"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useToast, type ToastTone } from "@/components/ui/toast";

/**
 * Reads a one-shot `?flash=<message>&flashTone=<tone>` query param (set by a
 * server action's post-success `redirect()`), fires a toast, then strips the
 * params from the URL so it doesn't re-fire on refresh/back.
 */
export function FlashToasts() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const shownRef = useRef<string | null>(null);

  useEffect(() => {
    const message = params.get("flash");
    if (!message) return;

    const key = `${pathname}?${params.toString()}`;
    if (shownRef.current === key) return;
    shownRef.current = key;

    const tone = (params.get("flashTone") as ToastTone | null) ?? "success";
    toast(message, tone);

    const next = new URLSearchParams(params.toString());
    next.delete("flash");
    next.delete("flashTone");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [params, pathname, router, toast]);

  return null;
}
