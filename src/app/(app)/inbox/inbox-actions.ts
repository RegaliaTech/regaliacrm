"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/rbac";
import { syncInbox } from "@/lib/inbox";
import { getSettings } from "@/lib/settings";
import { prisma } from "@/lib/db";

const THROTTLE_MS = 60 * 1000; // 60s

export type SyncInboxResult =
  | { ok: true; fetched: number; inserted: number; skipped: number; skippedForThrottle?: false }
  | { ok: true; skippedForThrottle: true; nextAllowedInMs: number }
  | { ok: false; error: string };

/**
 * User-triggered inbox pull. Throttled to once per minute — enough freshness
 * for CRM use, cheap enough to auto-run on every /emails page load.
 */
export async function syncInboxAction(
  opts: { force?: boolean } = {},
): Promise<SyncInboxResult> {
  await requireUser();
  try {
    if (!opts.force) {
      const s = await getSettings();
      if (s.inboxLastSyncedAt) {
        const elapsed = Date.now() - s.inboxLastSyncedAt.getTime();
        if (elapsed < THROTTLE_MS) {
          return {
            ok: true,
            skippedForThrottle: true,
            nextAllowedInMs: THROTTLE_MS - elapsed,
          };
        }
      }
    }

    const r = await syncInbox({ limit: 50 });
    revalidatePath("/inbox");
    if (r.errors.length && r.inserted === 0) {
      return { ok: false, error: r.errors[0] };
    }
    return {
      ok: true,
      fetched: r.fetched,
      inserted: r.inserted,
      skipped: r.skipped,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Sync failed.",
    };
  }
}

/**
 * Mark an inbound email as read/unread.
 */
export async function markInboxRead(
  id: string,
  isRead: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireUser();
  try {
    await prisma.emailLog.update({
      where: { id },
      data: { isRead },
    });
    revalidatePath("/inbox");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Update failed.",
    };
  }
}
