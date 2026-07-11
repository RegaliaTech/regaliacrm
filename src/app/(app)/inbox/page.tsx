import Link from "next/link";
import { Inbox } from "lucide-react";
import { requireUser } from "@/lib/rbac";
import { listEmails } from "@/lib/emails";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { SyncInboxButton } from "./sync-inbox-button";

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireUser();
  const { q } = await searchParams;
  const query = (q ?? "").trim().toLowerCase();

  const inbox = await listEmails({ direction: "INBOUND" });
  const emails = query
    ? inbox.filter((e) => {
        const haystack = [e.fromEmail, e.subject, e.customerName]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      })
    : inbox;

  const unreadCount = inbox.filter((e) => !e.isRead).length;

  return (
    <div className="animate-in mx-auto max-w-7xl space-y-6">
      <PageHeader
        title={
          <>
            <Inbox className="inline h-7 w-7 text-slate-600" /> Inbox
            {unreadCount > 0 && (
              <span className="ml-2 rounded-full bg-[var(--primary)] px-2 py-0.5 text-xs font-semibold text-[var(--primary-foreground)] align-middle">
                {unreadCount} new
              </span>
            )}
          </>
        }
        description="Messages received in your CRM mailbox."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SyncInboxButton />
        <SearchInput
          action="/inbox"
          defaultValue={query}
          placeholder="Search inbox..."
          className="max-w-xs flex-1"
          inputClassName="h-9 w-full"
        />
      </div>

      {emails.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={query ? "No messages found" : "Inbox is empty"}
          description={
            query
              ? "Try adjusting your search"
              : "Click Sync now to pull the latest messages from the mailbox."
          }
        />
      ) : (
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
      )}
    </div>
  );
}
