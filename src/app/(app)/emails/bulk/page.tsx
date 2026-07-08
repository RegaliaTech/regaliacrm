import Link from "next/link";
import { Plus, Megaphone } from "lucide-react";
import { requireRole, WRITE_ROLES } from "@/lib/rbac";
import { listBulkEmails } from "@/lib/bulk-emails";
import { formatDate } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";

export default async function BulkEmailsPage() {
  await requireRole(WRITE_ROLES);
  const campaigns = await listBulkEmails();

  const tone = {
    DRAFT: "muted" as const,
    SENDING: "warning" as const,
    SENT: "success" as const,
    FAILED: "danger" as const,
  };

  return (
    <div className="animate-in mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">
            <Megaphone className="inline h-7 w-7 text-slate-600" /> Bulk Mail
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Send a campaign to many customers at once.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/emails" className={buttonClasses("ghost", "md")}>
            Back to emails
          </Link>
          <Link href="/emails/bulk/new" className={buttonClasses("primary", "md")}>
            <Plus className="h-4 w-4" /> New campaign
          </Link>
        </div>
      </div>

      <Card className="p-0">
        <Table>
          <THead>
            <TR>
              <TH>Campaign</TH>
              <TH>Status</TH>
              <TH>Recipients</TH>
              <TH>Sent</TH>
              <TH>Failed</TH>
              <TH>Created</TH>
            </TR>
          </THead>
          <TBody>
            {campaigns.length === 0 ? (
              <TR>
                <TD colSpan={6} className="text-center text-[var(--muted)]">
                  No campaigns yet.
                </TD>
              </TR>
            ) : (
              campaigns.map((c) => (
                <TR key={c.id}>
                  <TD>
                    <Link
                      href={`/emails/bulk/${c.id}`}
                      className="font-medium text-[var(--primary)] hover:underline"
                    >
                      {c.name}
                    </Link>
                    <div className="text-xs text-[var(--muted)]">{c.subject}</div>
                  </TD>
                  <TD>
                    <Badge tone={tone[c.status]}>{c.status}</Badge>
                    {c.useAi && (
                      <Badge tone="primary" className="ml-1">
                        AI
                      </Badge>
                    )}
                  </TD>
                  <TD>{c.total}</TD>
                  <TD>{c.sentCount}</TD>
                  <TD>{c.failedCount}</TD>
                  <TD>{formatDate(c.createdAt)}</TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
