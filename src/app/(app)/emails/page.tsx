import Link from "next/link";
import { Plus, Mail, Clock, CheckCircle, XCircle, FileText } from "lucide-react";
import type { EmailStatus } from "@prisma/client";
import { requireUser, can, WRITE_ROLES } from "@/lib/rbac";
import { listEmails } from "@/lib/emails";
import { formatDate } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";

type TabKey = "all" | "sent" | "draft" | "failed";

const TABS: { key: TabKey; label: string; status?: EmailStatus }[] = [
  { key: "all", label: "All" },
  { key: "sent", label: "Sent", status: "SENT" },
  { key: "draft", label: "Drafts", status: "DRAFT" },
  { key: "failed", label: "Failed", status: "FAILED" },
];

function getStatusIcon(status: EmailStatus) {
  switch (status) {
    case "SENT":
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case "DRAFT":
      return <FileText className="h-4 w-4 text-slate-400" />;
    case "FAILED":
      return <XCircle className="h-4 w-4 text-red-600" />;
  }
}

function getStatusBadge(status: EmailStatus) {
  const tone = {
    SENT: "success" as const,
    DRAFT: "muted" as const,
    FAILED: "danger" as const,
  }[status];

  return (
    <Badge tone={tone}>
      {status}
    </Badge>
  );
}

export default async function EmailsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const user = await requireUser();
  const { tab, q } = await searchParams;
  const activeTab: TabKey =
    (TABS.find((t) => t.key === tab)?.key as TabKey) ?? "all";
  const query = (q ?? "").trim().toLowerCase();
  const canWrite = can(user.role, WRITE_ROLES);

  const all = await listEmails();
  const activeStatus = TABS.find((t) => t.key === activeTab)?.status;

  const emails = all.filter((e) => {
    if (activeStatus && e.status !== activeStatus) return false;
    if (query) {
      const haystack = [
        e.toEmail,
        e.subject,
        e.customerName,
        e.quotationNumber,
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
    sent: all.filter((e) => e.status === "SENT").length,
    draft: all.filter((e) => e.status === "DRAFT").length,
    failed: all.filter((e) => e.status === "FAILED").length,
  } satisfies Record<TabKey, number>;

  return (
    <div className="animate-in mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">
            <Mail className="inline h-7 w-7 text-slate-600" /> Emails
          </h1>
          <p className="text-sm text-[var(--muted)]">
            View and manage all email communications.
          </p>
        </div>
        {canWrite && (
          <Link href="/emails/new" className={buttonClasses("primary", "md")}>
            <Plus className="h-4 w-4" /> Compose email
          </Link>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="glass flex flex-wrap gap-1 rounded-2xl p-1">
          {TABS.map((t) => {
            const params = new URLSearchParams();
            if (t.key !== "all") params.set("tab", t.key);
            if (query) params.set("q", query);
            const href = params.toString()
              ? `/emails?${params.toString()}`
              : "/emails";
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

        <form className="flex-1" action="/emails" method="get">
          {tab && <input type="hidden" name="tab" value={tab} />}
          <div className="relative max-w-xs">
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search emails..."
              className="h-9 w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] pl-9 pr-3 text-sm text-slate-900 shadow-[var(--shadow-sm)] backdrop-blur-xl placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
            />
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Mail className="h-4 w-4 text-slate-400" />
            </div>
          </div>
        </form>
      </div>

      {emails.length === 0 ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border border-dashed border-[var(--border)] bg-[var(--card)] p-12 text-center backdrop-blur-xl shadow-[var(--shadow-sm)]">
          <div className="rounded-full bg-slate-100 p-4">
            <Mail className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-slate-900">
            {query
              ? "No emails found"
              : activeTab === "all"
                ? "No emails yet"
                : `No ${activeTab} emails`}
          </h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {query
              ? "Try adjusting your search"
              : "Compose your first email to get started"}
          </p>
          {canWrite && !query && (
            <Link
              href="/emails/new"
              className={cn(buttonClasses("primary", "md"), "mt-6")}
            >
              <Plus className="h-4 w-4" /> Compose email
            </Link>
          )}
        </div>
      ) : (
        <div className="glass overflow-hidden rounded-3xl">
          <Table>
            <THead>
              <TR>
                <TH>Status</TH>
                <TH>To</TH>
                <TH>Subject</TH>
                <TH>Customer</TH>
                <TH>Quotation</TH>
                <TH>Sent</TH>
                <TH>Created</TH>
              </TR>
            </THead>
            <TBody>
              {emails.map((email) => (
                <TR key={email.id}>
                  <TD>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(email.status)}
                      {getStatusBadge(email.status)}
                    </div>
                  </TD>
                  <TD>
                    <Link
                      href={`/emails/${email.id}`}
                      className="font-medium text-slate-900 hover:text-[var(--primary)]"
                    >
                      {email.toEmail}
                    </Link>
                  </TD>
                  <TD>
                    <div className="max-w-md truncate text-slate-600">
                      {email.subject}
                    </div>
                  </TD>
                  <TD>
                    {email.customerName ? (
                      <span className="text-slate-600">{email.customerName}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </TD>
                  <TD>
                    {email.quotationNumber ? (
                      <span className="text-slate-600">{email.quotationNumber}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </TD>
                  <TD>
                    {email.sentAt ? (
                      <time className="text-sm text-slate-600">
                        {formatDate(email.sentAt)}
                      </time>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </TD>
                  <TD>
                    <time className="text-sm text-slate-600">
                      {formatDate(email.createdAt)}
                    </time>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}
    </div>
  );
}
