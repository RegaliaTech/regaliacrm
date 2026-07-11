"use client";

import { useEffect, useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { syncInboxAction } from "@/app/(app)/inbox/inbox-actions";
import { cn } from "@/lib/utils";

/**
 * "Sync now" button + soft auto-sync on mount (throttled server-side to once
 * per minute, so mounting the page repeatedly is cheap).
 */
export function SyncInboxButton({
  autoSyncOnMount = true,
}: {
  autoSyncOnMount?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runSync = (force = false) => {
    setError(null);
    setStatus(null);
    startTransition(async () => {
      const r = await syncInboxAction({ force });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      if ("skippedForThrottle" in r && r.skippedForThrottle) {
        // Silent when auto-firing; visible only if user clicked
        if (force) {
          const secs = Math.ceil(r.nextAllowedInMs / 1000);
          setStatus(`Just synced — try again in ${secs}s.`);
        }
        return;
      }
      if (r.inserted === 0) {
        setStatus("No new messages.");
      } else {
        setStatus(
          `${r.inserted} new message${r.inserted === 1 ? "" : "s"}.`,
        );
      }
    });
  };

  // Auto-sync on mount (server throttles).
  useEffect(() => {
    if (autoSyncOnMount) runSync(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => runSync(true)}
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white/70 px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-white disabled:opacity-50"
      >
        <RefreshCw
          className={cn("h-4 w-4", isPending && "animate-spin")}
        />
        {isPending ? "Syncing…" : "Sync now"}
      </button>
      {(status || error) && (
        <span
          className={cn(
            "text-xs",
            error ? "text-red-600" : "text-slate-500",
          )}
        >
          {error ?? status}
        </span>
      )}
    </div>
  );
}
