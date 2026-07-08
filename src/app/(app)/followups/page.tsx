import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Clock, Calendar, CheckCircle, XCircle, AlertCircle, Ban, Sparkles } from "lucide-react";
import type { FollowUpStatus } from "@prisma/client";
import { requireUser, can, WRITE_ROLES, ADMIN_ROLES } from "@/lib/rbac";
import { listFollowUps } from "@/lib/followups";
import { runMaintainerNowAction } from "@/app/(app)/followups/actions";
import { formatDate } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";

type TabKey = "all" | "scheduled" | "sent" | "cancelled" | "failed";

const TABS: { key: TabKey; label: string; status?: FollowUpStatus }[] = [
  { key: "all", label: "All" },
  { key: "scheduled", label: "Scheduled", status: "SCHEDULED" },
  { key: "sent", label: "Sent", status: "SENT" },
  { key: "cancelled", label: "Cancelled", status: "CANCELLED" },
  { key: "failed", label: "Failed", status: "FAILED" },
];

function getStatusIcon(status: FollowUpStatus) {
  switch (status) {
    case "SCHEDULED":
      return <Clock className="h-4 w-4 text-blue-600" />;
    case "SENT":
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case "CANCELLED":
      return <Ban className="h-4 w-4 text-slate-400" />;
    case "FAILED":
      return <XCircle className="h-4 w-4 text-red-600" />;
  }
}

function getStatusBadge(status: FollowUpStatus) {
  const tone = {
    SCHEDULED: "primary" as const,
    SENT: "success" as const,
    CANCELLED: "muted" as const,
    FAILED: "danger" as const,
  }[status];

  return (
    <Badge tone={tone}>
      {status}
    </Badge>
  );
}

function isPastDue(scheduledAt: Date, status: FollowUpStatus): boolean {
  return status === "SCHEDULED" && new Date() > scheduledAt;
}

export default async function FollowUpsPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    q?: string;
    maintainerResult?: string;
    maintainerError?: string;
  }>;
}) {
  const user = await requireUser();
  const { tab, q, maintainerResult, maintainerError } = await searchParams;
  const activeTab: TabKey =
    (TABS.find((t) => t.key === tab)?.key as TabKey) ?? "all";
  const query = (q ?? "").trim().toLowerCase();
  const canWrite = can(user.role, WRITE_ROLES);
  const canRunMaintainer = can(user.role, ADMIN_ROLES);

  const handleRunMaintainer = async () => {
    "use server";
    const result = await runMaintainerNowAction();
    const params = new URLSearchParams();
    if (tab) params.set("tab", tab);
    if (q) params.set("q", q);
    if (result.error) {
      params.set("maintainerError", result.error);
    } else {
      params.set(
        "maintainerResult",
        `Scanned ${result.scanned}, created ${result.created}, skipped ${result.skipped}`,
      );
    }
    redirect(`/followups?${params.toString()}`);
  };

  const all = await listFollowUps();
  const activeStatus = TABS.find((t) => t.key === activeTab)?.status;

  const followUps = all.filter((f) => {
    if (activeStatus && f.status !== activeStatus) return false;
    if (query) {
      const haystack = [
        f.caseSubject,
        f.customerName,
        f.customerEmail,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  const counts = {
    all: all.length,
    scheduled: all.filter((f) => f.status === "SCHEDULED").length,
    sent: all.filter((f) => f.status === "SENT").length,
    cancelled: all.filter((f) => f.status === "CANCELLED").length,
    failed: all.filter((f) => f.status === "FAILED").length,
  } satisfies Record<TabKey, number>;

  return (
    <div className="animate-in mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">
            <Clock className="inline h-7 w-7 text-slate-600" /> Follow-ups
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Schedule and manage automated customer follow-ups.
          </p>
        </div>
        {canWrite && (
          <div className="flex gap-2">
            {canRunMaintainer && (
              <form action={handleRunMaintainer}>
                <button
                  type="submit"
                  className={buttonClasses("ghost", "md")}
                  title="Scan for customers/quotations with no follow-up pending and auto-create one"
                >
                  <Sparkles className="h-4 w-4" /> Run AI maintainer
                </button>
              </form>
            )}
            <Link
              href="/followups/sequences"
              className={buttonClasses("ghost", "md")}
            >
              AI Sequences
            </Link>
            <Link href="/followups/new" className={buttonClasses("primary", "md")}>
              <Plus className="h-4 w-4" /> Schedule follow-up
            </Link>
          </div>
        )}
      </div>

      {maintainerResult && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          AI maintainer: {maintainerResult}
        </div>
      )}
      {maintainerError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          AI maintainer failed: {maintainerError}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="glass flex flex-wrap gap-1 rounded-2xl p-1">
          {TABS.map((t) => {
            const params = new URLSearchParams();
            if (t.key !== "all") params.set("tab", t.key);
            if (query) params.set("q", query);
            const href = params.toString()
              ? `/followups?${params.toString()}`
              : "/followups";
            const active = t.key === activeTab;
            return (
              <Link
                key={t.key}
                href={href}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
              >
                {t.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-xs font-medium tabular-nums",
                    active
                      ? "bg-white/20 text-[var(--primary-foreground)]"
                      : "bg-slate-100 text-slate-600",
                  )}
                >
                  {counts[t.key]}
                </span>
              </Link>
            );
          })}
        </div>

        <form className="flex-1" action="/followups" method="get">
          {tab && <input type="hidden" name="tab" value={tab} />}
          <div className="relative max-w-xs">
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search follow-ups..."
              className="h-9 w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] pl-9 pr-3 text-sm text-slate-900 shadow-[var(--shadow-sm)] backdrop-blur-xl placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
            />
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Clock className="h-4 w-4 text-slate-400" />
            </div>
          </div>
        </form>
      </div>

      {followUps.length === 0 ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border border-dashed border-[var(--border)] bg-[var(--card)] p-12 text-center backdrop-blur-xl shadow-[var(--shadow-sm)]">
          <div className="rounded-full bg-slate-100 p-4">
            <Clock className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-slate-900">
            {query
              ? "No follow-ups found"
              : activeTab === "all"
                ? "No follow-ups yet"
                : `No ${activeTab} follow-ups`}
          </h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {query
              ? "Try adjusting your search"
              : "Schedule your first follow-up to get started"}
          </p>
          {canWrite && !query && (
            <Link
              href="/followups/new"
              className={cn(buttonClasses("primary", "md"), "mt-6")}
            >
              <Plus className="h-4 w-4" /> Schedule follow-up
            </Link>
          )}
        </div>
      ) : (
        <div className="glass overflow-hidden rounded-3xl">
          <Table>
            <THead>
              <TR>
                <TH>Status</TH>
                <TH>Case</TH>
                <TH>Customer</TH>
                <TH>Scheduled</TH>
                <TH>Sent</TH>
                <TH>AI</TH>
                <TH>Created</TH>
              </TR>
            </THead>
            <TBody>
              {followUps.map((followUp) => {
                const isOverdue = isPastDue(followUp.scheduledAt, followUp.status);
                return (
                  <TR key={followUp.id} className={isOverdue ? "bg-red-50" : ""}>
                    <TD>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(followUp.status)}
                        {getStatusBadge(followUp.status)}
                      </div>
                    </TD>
                    <TD>
                      <Link
                        href={`/followups/${followUp.id}`}
                        className="font-medium text-slate-900 hover:text-[var(--primary)]"
                      >
                        {followUp.caseSubject}
                      </Link>
                    </TD>
                    <TD>
                      <div>
                        <div className="font-medium text-slate-900">
                          {followUp.customerName}
                        </div>
                        {followUp.customerEmail && (
                          <div className="text-sm text-slate-500">
                            {followUp.customerEmail}
                          </div>
                        )}
                      </div>
                    </TD>
                    <TD>
                      <div className="flex items-center gap-2">
                        <time className="text-sm text-slate-600">
                          {formatDate(followUp.scheduledAt)}
                        </time>
                        {isOverdue && (
                          <span title="Overdue">
                            <AlertCircle className="h-4 w-4 text-red-600" />
                          </span>
                        )}
                      </div>
                    </TD>
                    <TD>
                      {followUp.sentAt ? (
                        <time className="text-sm text-slate-600">
                          {formatDate(followUp.sentAt)}
                        </time>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TD>
                    <TD>
                      <div className="flex flex-wrap gap-1">
                        {followUp.useAi && <Badge tone="primary">AI</Badge>}
                        {followUp.autoCreated && (
                          <Badge tone="warning">Auto</Badge>
                        )}
                        {followUp.reviewStatus === "PENDING_REVIEW" && (
                          <Badge tone="danger">Review</Badge>
                        )}
                        {!followUp.useAi && !followUp.autoCreated && (
                          <span className="text-slate-400">—</span>
                        )}
                      </div>
                    </TD>
                    <TD>
                      <time className="text-sm text-slate-600">
                        {formatDate(followUp.createdAt)}
                      </time>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </div>
      )}
    </div>
  );
}
