import Link from "next/link";
import { Plus, Mail, CheckCircle, XCircle, FileText, Inbox } from "lucide-react";
import type { EmailDirection, EmailStatus } from "@prisma/client";
import { requireUser, can, WRITE_ROLES } from "@/lib/rbac";
import { listEmails } from "@/lib/emails";
import { formatDate } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { SyncInboxButton } from "./sync-inbox-button";

type TabKey = "inbox" | "all" | "sent" | "draft" | "failed";

const TABS: {
  key: TabKey;
  label: string;
  status?: EmailStatus;
  direction?: EmailDirection;
}[] = [
  { key: "inbox", label: "Inbox", direction: "INBOUND" },
  { key: "all", label: "All Sent" },
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
    (TABS.find((t) => t.key === tab)?.key as TabKey) ?? "inbox";
  const query = (q ?? "").trim().toLowerCase();
  const canWrite = can(user.role, WRITE_ROLES);

  const all = await listEmails();
  const activeStatus = TABS.find((t) => t.key === activeTab)?.status;
  const activeDirection = TABS.find((t) => t.key === activeTab)?.direction;

  const emails = all.filter((e) => {
    if (activeDirection && e.direction !== activeDirection) return false;
    // Non-inbox tabs default to outbound to keep counts sensible.
    if (activeTab !== "inbox" && e.direction === "INBOUND") return false;
    if (activeStatus && e.status !== activeStatus) return false;
    if (query) {
      const haystack = [
        e.toEmail,
        e.fromEmail,
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

  const outbound = all.filter((e) => e.direction === "OUTBOUND");
  const counts = {
    inbox: all.filter((e) => e.direction === "INBOUND").length,
    all: outbound.length,
    sent: outbound.filter((e) => e.status === "SENT").length,
    draft: outbound.filter((e) => e.status === "DRAFT").length,
    failed: outbound.filter((e) => e.status === "FAILED").length,
  } satisfies Record<TabKey, number>;

  const isInbox = activeTab === "inbox";

  return (
    <div className="animate-in mx-auto max-w-7xl space-y-6">
      <PageHeader
        title={
          <>
            <Mail className="inline h-7 w-7 text-slate-600" /> Emails
          </>
        }
        description="View and manage all email communications."
        action={
          canWrite && (
            <Link href="/emails/new" className={buttonClasses("primary", "md")}>
              <Plus className="h-4 w-4" /> Compose email
            </Link>
          )
        }
      />

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

        <div className="flex items-center gap-3">
          {isInbox && <SyncInboxButton />}
          <SearchInput
            action="/emails"
            defaultValue={query}
            placeholder="Search emails..."
            hidden={tab ? { tab } : undefined}
            className="max-w-xs flex-1"
            inputClassName="h-9 w-full"
          />
        </div>
      </div>

      {emails.length === 0 ? (
        <EmptyState
          icon={isInbox ? Inbox : Mail}
          title={
            query
              ? "No emails found"
              : isInbox
                ? "Inbox is empty"
                : activeTab === "all"
                  ? "No emails yet"
                  : `No ${activeTab} emails`
          }
          description={
            query
              ? "Try adjusting your search"
              : isInbox
                ? "Click Sync now to pull the latest messages from the mailbox."
                : "Compose your first email to get started"
          }
          action={
            !isInbox && canWrite && !query ? (
              <Link
                href="/emails/new"
                className={buttonClasses("primary", "md")}
              >
                <Plus className="h-4 w-4" /> Compose email
              </Link>
            ) : undefined
          }
        />
      ) : isInbox ? (
        <div className="glass overflow-hidden rounded-3xl">
          <Table>
            <THead>
              <TR>
                <TH>From</TH>
                <TH>Subject</TH>
                <TH>Customer</TH>
                <TH>Received</TH>
              </TR>
            </THead>
            <TBody>
              {emails.map((email) => (
                <TR key={email.id}>
                  <TD>
                    <div className="flex items-center gap-2">
                      {!email.isRead && (
                        <span className="inline-block h-2 w-2 rounded-full bg-[var(--primary)]" />
                      )}
                      <Link
                        href={`/emails/${email.id}`}
                        className={cn(
                          "hover:text-[var(--primary)]",
                          email.isRead
                            ? "text-slate-600"
                            : "font-semibold text-slate-900",
                        )}
                      >
                        {email.fromEmail ?? "—"}
                      </Link>
                    </div>
                  </TD>
                  <TD>
                    <div
                      className={cn(
                        "max-w-md truncate",
                        email.isRead ? "text-slate-600" : "text-slate-900",
                      )}
                    >
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
                    {email.receivedAt ? (
                      <time className="text-sm text-slate-600">
                        {formatDate(email.receivedAt)}
                      </time>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
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
