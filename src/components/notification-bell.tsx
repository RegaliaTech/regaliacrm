"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Clock, XCircle, CalendarClock, MailWarning, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NotificationItem, NotificationType } from "@/lib/notifications";

const DISMISSED_KEY = "regalia:notifications:dismissed";
const POLL_INTERVAL_MS = 60_000;

const ICONS: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  followup_overdue: Clock,
  followup_failed: XCircle,
  email_failed: MailWarning,
  quotation_expiring: CalendarClock,
  bulk_failed: MailWarning,
  maintainer_pending_review: Sparkles,
};

const GROUP_LABELS = ["Follow-ups", "Quotations", "Emails", "Bulk Mail"] as const;
type GroupLabel = (typeof GROUP_LABELS)[number];

const GROUP_BY_TYPE: Record<NotificationType, GroupLabel> = {
  followup_overdue: "Follow-ups",
  followup_failed: "Follow-ups",
  maintainer_pending_review: "Follow-ups",
  quotation_expiring: "Quotations",
  email_failed: "Emails",
  bulk_failed: "Bulk Mail",
};

function groupNotifications(
  items: NotificationItem[],
): { label: GroupLabel; items: NotificationItem[] }[] {
  const byGroup = new Map<GroupLabel, NotificationItem[]>();
  for (const item of items) {
    const label = GROUP_BY_TYPE[item.type];
    const list = byGroup.get(label);
    if (list) list.push(item);
    else byGroup.set(label, [item]);
  }
  return GROUP_LABELS.filter((label) => byGroup.has(label)).map((label) => ({
    label,
    items: byGroup.get(label)!,
  }));
}

function loadDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(DISMISSED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveDismissed(ids: Set<string>) {
  window.localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
}

function timeAgo(date: Date): string {
  const seconds = Math.max(0, (Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationBell({ initial }: { initial: NotificationItem[] }) {
  const [items, setItems] = useState<NotificationItem[]>(initial);
  const [dismissed, setDismissed] = useState<Set<string>>(() => loadDismissed());
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function refresh() {
      try {
        const res = await fetch("/api/notifications");
        if (!res.ok) return;
        const data = await res.json();
        setItems(
          (data.notifications as NotificationItem[]).map((n) => ({
            ...n,
            createdAt: new Date(n.createdAt),
          })),
        );
      } catch {
        // ignore transient network errors; keep showing last known list
      }
    }

    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const unreadCount = items.filter((n) => !dismissed.has(n.id)).length;

  function markAllRead() {
    const next = new Set(dismissed);
    for (const n of items) next.add(n.id);
    setDismissed(next);
    saveDismissed(next);
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className="ios-press relative flex h-10 w-10 items-center justify-center rounded-2xl text-gray-500 hover:bg-white/70 hover:text-slate-900 hover:shadow-[var(--shadow-sm)]"
        title="Notifications"
      >
        <Bell className="h-[18px] w-[18px]" strokeWidth={2} />
        {unreadCount > 0 && (
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white shadow-sm shadow-rose-500/50" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-30 w-80 overflow-hidden rounded-2xl border border-[var(--border)] bg-white/90 shadow-[var(--shadow-md)] backdrop-blur-2xl backdrop-saturate-150 sm:w-96">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <span className="text-sm font-semibold text-slate-900">
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                You&rsquo;re all caught up.
              </div>
            ) : (
              groupNotifications(items).map((group) => (
                <div key={group.label}>
                  <div className="sticky top-0 bg-slate-50/95 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 backdrop-blur-sm">
                    {group.label}
                  </div>
                  {group.items.map((n) => {
                    const Icon = ICONS[n.type];
                    const unread = !dismissed.has(n.id);
                    return (
                      <Link
                        key={n.id}
                        href={n.href}
                        onClick={() => setOpen(false)}
                        className="flex gap-3 border-b border-[var(--border)] px-4 py-3 last:border-b-0 hover:bg-slate-50"
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                            n.severity === "danger"
                              ? "bg-rose-500/10 text-rose-600"
                              : "bg-amber-500/10 text-amber-600",
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-medium text-slate-900">
                              {n.title}
                            </span>
                            {unread && (
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                            )}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-gray-500">
                            {n.message}
                          </span>
                          <span className="mt-0.5 block text-[11px] text-gray-400">
                            {timeAgo(n.createdAt)}
                          </span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
