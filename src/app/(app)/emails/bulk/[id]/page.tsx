import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Send, Trash2 } from "lucide-react";
import { requireRole, WRITE_ROLES } from "@/lib/rbac";
import { getBulkEmail } from "@/lib/bulk-emails";
import {
  sendBulkEmailAction,
  deleteBulkEmailAction,
} from "@/app/(app)/emails/bulk/actions";
import { formatDate } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";

export default async function BulkEmailDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(WRITE_ROLES);
  const { id } = await params;
  const bulk = await getBulkEmail(id);
  if (!bulk) notFound();

  const pending = bulk.recipients.filter((r) => r.status === "PENDING").length;

  const handleSend = async () => {
    "use server";
    await sendBulkEmailAction(id);
  };

  const handleDelete = async () => {
    "use server";
    const res = await deleteBulkEmailAction(id);
    if (!res.error) redirect("/emails/bulk");
  };

  const statusTone = {
    DRAFT: "muted" as const,
    SENDING: "warning" as const,
    SENT: "success" as const,
    FAILED: "danger" as const,
  };
  const recTone: Record<string, "muted" | "success" | "danger" | "warning"> = {
    PENDING: "muted",
    SENT: "success",
    FAILED: "danger",
    SKIPPED: "warning",
  };

  return (
    <div className="animate-in mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/emails/bulk" className={buttonClasses("ghost", "sm")}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-[26px] font-semibold tracking-tight text-slate-900">
            {bulk.name}
          </h1>
          <p className="text-sm text-[var(--muted)]">{bulk.subject}</p>
        </div>
        <div className="flex gap-2">
          {pending > 0 && (
            <form action={handleSend}>
              <button type="submit" className={buttonClasses("primary", "sm")}>
                <Send className="h-4 w-4" /> Send {pending} pending
              </button>
            </form>
          )}
          <form action={handleDelete}>
            <button type="submit" className={buttonClasses("ghost", "sm")}>
              <Trash2 className="h-4 w-4 text-red-600" />
            </button>
          </form>
        </div>
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={statusTone[bulk.status]}>{bulk.status}</Badge>
          {bulk.useAi && <Badge tone="primary">AI personalised</Badge>}
          <span className="text-sm text-[var(--muted)]">
            {bulk.sentCount} sent · {bulk.failedCount} failed · {bulk.total} total
          </span>
          <span className="ml-auto text-sm text-[var(--muted)]">
            {formatDate(bulk.createdAt)}
          </span>
        </div>
        <div className="mt-4 rounded-lg border border-[var(--border)] bg-slate-50 p-4">
          <pre className="whitespace-pre-wrap font-sans text-sm text-slate-900">
            {bulk.body}
          </pre>
        </div>
      </Card>

      <Card className="p-0">
        <Table>
          <THead>
            <TR>
              <TH>Recipient</TH>
              <TH>Email</TH>
              <TH>Status</TH>
              <TH>Sent</TH>
            </TR>
          </THead>
          <TBody>
            {bulk.recipients.map((r) => (
              <TR key={r.id}>
                <TD>{r.customerName ?? "—"}</TD>
                <TD>{r.toEmail}</TD>
                <TD>
                  <Badge tone={recTone[r.status] ?? "muted"}>{r.status}</Badge>
                  {r.error && (
                    <div className="text-xs text-red-600">{r.error}</div>
                  )}
                </TD>
                <TD>{r.sentAt ? formatDate(r.sentAt) : "—"}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
